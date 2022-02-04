import { readFile, readFileSync, writeFileSync } from 'fs'

const NTFunctionDeclaration = "ntfd"
const NTReturnStatement = "ntrs"

function astNode(type, data) {
    return {type: type, data: data}
}

const isNumber = (word) => {
    //binary numbers, decimal numbers, hexadecimal numbers

    const bases = [
        {
            base: 2,
            characters: ['0', '1'],
            prefix: "0b"
        },
        {
            base: 16,
            characters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'],
            prefix: "0x"
        },
        {
            base: 10,
            characters: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
            prefix: ""
        }
    ]
    for (let base of bases) {
        if (word.startsWith(base.prefix)) {
            word = word.slice(base.prefix.length, word.length)
            let hasPoint = false
            for (let c of word) {

                if (!base.characters.includes(c.toUpperCase())) {
                    if (c === '.') {
                        if (hasPoint) {
                            return false
                        } else {
                            hasPoint = true
                        }
                    } else {
                        return false
                    }
                }
            }
            return true
            break
        }
    }
}


const tokenise = (fileName, data) => {
    const delimiters = ['\r', '\n', '\t', ' ']
    const control = [';', '{', '}', '[', ']', '\'', '\\']
    let words = []
    let currentWord = ""
    let escape = false
    let currentEscape = false
    let inStringLiteral = false
    let lit = ""
    let startRow = 1
    let startColumn = 1
    let currentRow = 1
    let currentColumn = 0
    for (let c of data) {
        currentEscape = false
        currentColumn += 1
        if (c === '\n') {
            currentRow += 1
            currentColumn = 0
        }
        if (inStringLiteral) {
            if (c === '\\' && !escape) {
                escape = true
                currentEscape = true
            } else {
                if(c === '\\' && escape) {
                    lit = lit.concat(c)
                    escape = false
                } else {
                    if (c !== '\"' && !escape) {
                        lit = lit.concat(c)

                    } else {
                        if (escape && !currentEscape) {
                            lit = lit.concat(c)
                            escape = false
                        } else {
                            words.push({
                                startLine: startRow,
                                startColumn: startColumn,
                                data: lit,
                                stringLit: true
                            })
                            lit = ""
                            inStringLiteral = false
                        }
                    }
                }
            }
        } else {
            if (delimiters.includes(c) || control.includes(c)) {
                if (currentWord.length !== 0) {
                    words.push({
                        startLine: startRow,
                        startColumn: startColumn,
                        data: currentWord
                    })
                }
                currentWord = ""
                if (control.includes(c)) {
                    words.push({
                        startLine: currentRow,
                        startColumn: currentColumn,
                        data: c
                    })
                }
            } else if (c === '\"') {
                if (!inStringLiteral) {
                    inStringLiteral = true
                    startRow = currentRow
                    startColumn = currentColumn
                }
            } else {
                if (currentWord === "") {
                    startRow = currentRow
                    startColumn = currentColumn
                }
                currentWord = currentWord.concat(c)
                if (currentWord.endsWith('->')) {
                    currentWord = currentWord.slice(0, currentWord.length - 2)
                    if (currentWord.length !== 0) {
                        words.push({
                            startLine: startRow,
                            startColumn: startColumn,
                            data: currentWord
                        })
                    }
                    words.push({
                        startLine: currentRow,
                        startColumn: currentColumn - 1,
                        data: '->'
                    })
                    currentWord = ""
                }
            }
        }
    }
    if (currentWord.length !== 0) {
        words.push(currentWord)
    }
    let tokens = []

    const tokentypes = {
        "fn": "FUNCTION",
        "->": "ARROW",
        "{": "RIGHT_CURLY_BRACKET",
        "}": "LEFT_CURLY_BRACKET",
        "[": "RIGHT_SQUARE_BRACKET",
        "]": "LEFT_SQUARE_BRACKET",
        "(": "RIGHT_PARENTHESE",
        ")": "LEFT_PARENTHESE",
        "return": "RETURN",
        "\;": "SEMICOLON"
    }

    for (let word of words) {
        if (tokentypes[word.data]) {

            tokens.push({
                type: tokentypes[word.data],
                location: `${fileName}:[${word.startLine},${word.startColumn}]`,
                data: word.data
            })


        } else {
            if (word.stringLit) {
                tokens.push({
                    type: "STRING_LITERAL",
                    location: `${fileName}:[${word.startLine},${word.startColumn}]`,
                    data: word.data
                })
            } else {
                if (isNumber(word.data)) {
                    tokens.push({
                        type: "NUMBER_LITERAL",
                        location: `${fileName}:[${word.startLine},${word.startColumn}]`,
                        data: word.data
                    })
                } else {
                    tokens.push({
                        type: "IDENTIFIER",
                        location: `${fileName}:[${word.startLine},${word.startColumn}]`,
                        data: word.data
                    })
                }
            }
        }
    }






    return tokens
}

const parse = (tokens) => {

    let index = 0

    // "fn": "FUNCTION",
    // "->": "ARROW",
    // "{": "RIGHT_CURLY_BRACKET",
    // "}": "LEFT_CURLY_BRACKET",
    // "[": "RIGHT_SQUARE_BRACKET",
    // "]": "LEFT_SQUARE_BRACKET",
    // "(": "RIGHT_PARENTHESE",
    // ")": "LEFT_PARENTHESE",
    // "return": "RETURN",
    // "\;": "SEMICOLON"

    // type: "IDENTIFIER",
    // location: `${fileName}:[${word.startLine},${word.startColumn}]`,
    // data: word.data
    const expect = (...tokenTypes) => {
        if(!tokenTypes.includes(tokens[index].type)) {
            if(tokenTypes.length === 1) {
                console.error(`expected token ${tokenTypes[0]}, got ${tokens[index].type}`)
            } else {
                console.error(`expected tokens ${tokenTypes}, got ${tokens[index].type}`)
            }
            return false
        }
        let oldTokenType = tokens[index].type
        index += 1
        return oldTokenType
    }
    const advance = () => index += 1
    const assert = (...tokenTypes) => {
        if(!tokenTypes.includes(tokens[index].type)) {
            if(tokenTypes.length === 1) {
                console.error(`expected token ${tokenTypes[0]}, got ${tokens[index].type}`)
            } else {
                console.error(`expected tokens ${tokenTypes}, got ${tokens[index].type}`)
            }
            return false
        }
        return tokens[index].type
    }
    const data = () => {
        return tokens[index].data
    }
    //expects tokens[index] to point to the first '{'
    const readBlock = () => {
        
    }
    //expects tokens[index] to point to the 'fn' token
    const readFunctionDeclaration = () => {
        expect("FUNCTION")
        assert("IDENTIFIER")
        const fnName = data()
        let returnType = ""
        let type = expect("ARROW", "RIGHT_CURLY_BRACKET") 
        if(type === "ARROW") {
            assert("IDENTIFIER")
            returnType = data() 
            advance()
            expect("RIGHT_CURLY_BRACKET")
        }
        const block = readBlock()
    }
    const readReturnStatement = () => {

    }

    readFunctionDeclaration() 
}
const compile = (fileName) => {

    const tokens = tokenise(fileName, readFileSync(fileName, 'ascii'))
    const nodes = parse(tokens)
    console.log()
}
export { compile }