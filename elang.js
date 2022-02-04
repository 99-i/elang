import {compile} from './compile.js'
const usage = () => {
    const scriptName = process.argv[1].split('\\').at(-1)
    const nodeName = process.argv[0].split('\\').at(-1).split('.').at(0)
    console.log(`USAGE: ${nodeName} ${scriptName} [file]`)
}
const fileToCompile = process.argv[2]

if(!fileToCompile) {
    usage()
} else {
    compile(fileToCompile)
}
