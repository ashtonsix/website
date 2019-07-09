const Mold = require("mold-template")
const markdown = require("markdown-it")({html: true}).use(require("markdown-it-deflist")).use(require("markdown-it-anchor"))
const {join} = require("path")
const {readFileSync, readdirSync} = require("fs")
const {mapDir} = require("./mapdir")
const {buildRef, linkRef} = require("./buildref")

let base = join(__dirname, "..")

function loadTemplates(dir, env) {
  let mold = new Mold(env)
  for (let filename of readdirSync(dir)) {
    let match = /^(.*?)\.html$/.exec(filename)
    if (match) mold.bake(match[1], readFileSync(join(dir, filename), "utf8").trim())
  }
  mold.defs.markdown = function(options) {
    if (typeof options == "string") options = {text: options}
    return markdown.render(linkRef(options.text))
  }
  mold.defs.markdownFile = function(options) {
    if (typeof options == "string") options = {file: options}
    options.text = readFileSync(join(base, options.file + ".md"), "utf8")
    return mold.defs.markdown(options)
  }
  return mold
}

let mold = loadTemplates(join(base, "template"), {})

mapDir(join(base, "site"), join(base, "output"), (fullPath, name) => {
  if (name == "docs/ref/index.html") {
    return {content: mold.bake(name, readFileSync(fullPath, "utf8"))({fileName: name, modules: buildRef()})}
  } else if (/\.md$/.test(name)) {
    let text = readFileSync(fullPath, "utf8")
    let meta = /^!(\{[^]*?\})\n\n/.exec(text)
    let data = meta ? JSON.parse(meta[1]) : {}
    data.content = meta ? text.slice(meta[0].length) : text
    data.fileName = name
    return {name: name.replace(/\.md$/, ".html"),
            content: mold.defs[data.template || "page"](data)}
  } else if (/\.html$/.test(name)) {
    return {content: mold.bake(name, readFileSync(fullPath, "utf8"))({fileName: name})}
  } else {
    return null
  }
})
