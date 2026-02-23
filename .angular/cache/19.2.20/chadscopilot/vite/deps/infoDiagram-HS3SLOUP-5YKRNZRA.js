import {
  parse
} from "./chunk-N5HZELBH.js";
import "./chunk-C4G3Z3YQ.js";
import "./chunk-H3M72AB5.js";
import "./chunk-3E4QQZEV.js";
import "./chunk-PGY7O35M.js";
import "./chunk-WC3AWGEK.js";
import "./chunk-HQ6HFUPF.js";
import "./chunk-57YYMRUM.js";
import "./chunk-34SDZ4XG.js";
import "./chunk-KEJRQR7A.js";
import {
  package_default
} from "./chunk-JSKLGOKY.js";
import {
  selectSvgElement
} from "./chunk-CTWSR5GA.js";
import {
  configureSvgSize
} from "./chunk-KRNTUFVY.js";
import {
  __name,
  log
} from "./chunk-UKZBE7BY.js";
import "./chunk-UKEJCSU4.js";
import "./chunk-S3PAIZX7.js";
import {
  __async
} from "./chunk-5PDL3II3.js";

// node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-HS3SLOUP.mjs
var parser = {
  parse: __name((input) => __async(null, null, function* () {
    const ast = yield parse("info", input);
    log.debug(ast);
  }), "parse")
};
var DEFAULT_INFO_DB = {
  version: package_default.version + (true ? "" : "-tiny")
};
var getVersion = __name(() => DEFAULT_INFO_DB.version, "getVersion");
var db = {
  getVersion
};
var draw = __name((text, id, version) => {
  log.debug("rendering info diagram\n" + text);
  const svg = selectSvgElement(id);
  configureSvgSize(svg, 100, 400, true);
  const group = svg.append("g");
  group.append("text").attr("x", 100).attr("y", 40).attr("class", "version").attr("font-size", 32).style("text-anchor", "middle").text(`v${version}`);
}, "draw");
var renderer = {
  draw
};
var diagram = {
  parser,
  db,
  renderer
};
export {
  diagram
};
//# sourceMappingURL=infoDiagram-HS3SLOUP-5YKRNZRA.js.map
