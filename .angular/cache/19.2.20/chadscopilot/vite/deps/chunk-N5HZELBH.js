import {
  __name
} from "./chunk-34SDZ4XG.js";
import {
  __async
} from "./chunk-5PDL3II3.js";

// node_modules/@mermaid-js/parser/dist/mermaid-parser.core.mjs
var parsers = {};
var initializers = {
  info: __name(() => __async(null, null, function* () {
    const {
      createInfoServices: createInfoServices2
    } = yield import("./info-VBDWY6EO-XWL5BWHA.js");
    const parser = createInfoServices2().Info.parser.LangiumParser;
    parsers.info = parser;
  }), "info"),
  packet: __name(() => __async(null, null, function* () {
    const {
      createPacketServices: createPacketServices2
    } = yield import("./packet-DYOGHKS2-OOHEOKWH.js");
    const parser = createPacketServices2().Packet.parser.LangiumParser;
    parsers.packet = parser;
  }), "packet"),
  pie: __name(() => __async(null, null, function* () {
    const {
      createPieServices: createPieServices2
    } = yield import("./pie-VRWISCQL-75AKUI2P.js");
    const parser = createPieServices2().Pie.parser.LangiumParser;
    parsers.pie = parser;
  }), "pie"),
  architecture: __name(() => __async(null, null, function* () {
    const {
      createArchitectureServices: createArchitectureServices2
    } = yield import("./architecture-7HQA4BMR-UVROQUDQ.js");
    const parser = createArchitectureServices2().Architecture.parser.LangiumParser;
    parsers.architecture = parser;
  }), "architecture"),
  gitGraph: __name(() => __async(null, null, function* () {
    const {
      createGitGraphServices: createGitGraphServices2
    } = yield import("./gitGraph-G5XIXVHT-YGB5AQEY.js");
    const parser = createGitGraphServices2().GitGraph.parser.LangiumParser;
    parsers.gitGraph = parser;
  }), "gitGraph"),
  radar: __name(() => __async(null, null, function* () {
    const {
      createRadarServices: createRadarServices2
    } = yield import("./radar-ZZBFDIW7-5TO2NJ6E.js");
    const parser = createRadarServices2().Radar.parser.LangiumParser;
    parsers.radar = parser;
  }), "radar"),
  treemap: __name(() => __async(null, null, function* () {
    const {
      createTreemapServices: createTreemapServices2
    } = yield import("./treemap-GDKQZRPO-RK6NYIHH.js");
    const parser = createTreemapServices2().Treemap.parser.LangiumParser;
    parsers.treemap = parser;
  }), "treemap")
};
function parse(diagramType, text) {
  return __async(this, null, function* () {
    const initializer = initializers[diagramType];
    if (!initializer) {
      throw new Error(`Unknown diagram type: ${diagramType}`);
    }
    if (!parsers[diagramType]) {
      yield initializer();
    }
    const parser = parsers[diagramType];
    const result = parser.parse(text);
    if (result.lexerErrors.length > 0 || result.parserErrors.length > 0) {
      throw new MermaidParseError(result);
    }
    return result.value;
  });
}
__name(parse, "parse");
var MermaidParseError = class extends Error {
  constructor(result) {
    const lexerErrors = result.lexerErrors.map((err) => err.message).join("\n");
    const parserErrors = result.parserErrors.map((err) => err.message).join("\n");
    super(`Parsing failed: ${lexerErrors} ${parserErrors}`);
    this.result = result;
  }
  static {
    __name(this, "MermaidParseError");
  }
};

export {
  parse
};
//# sourceMappingURL=chunk-N5HZELBH.js.map
