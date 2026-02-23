import {
  AbstractMermaidTokenBuilder,
  AbstractMermaidValueConverter,
  ArchitectureGrammarGeneratedModule,
  EmptyFileSystem,
  MermaidGeneratedSharedModule,
  __name,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  lib_exports
} from "./chunk-34SDZ4XG.js";

// node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-UMXZTB3W.mjs
var ArchitectureTokenBuilder = class extends AbstractMermaidTokenBuilder {
  static {
    __name(this, "ArchitectureTokenBuilder");
  }
  constructor() {
    super(["architecture"]);
  }
};
var ArchitectureValueConverter = class extends AbstractMermaidValueConverter {
  static {
    __name(this, "ArchitectureValueConverter");
  }
  runCustomConverter(rule, input, _cstNode) {
    if (rule.name === "ARCH_ICON") {
      return input.replace(/[()]/g, "").trim();
    } else if (rule.name === "ARCH_TEXT_ICON") {
      return input.replace(/["()]/g, "");
    } else if (rule.name === "ARCH_TITLE") {
      return input.replace(/[[\]]/g, "").trim();
    }
    return void 0;
  }
};
var ArchitectureModule = {
  parser: {
    TokenBuilder: __name(() => new ArchitectureTokenBuilder(), "TokenBuilder"),
    ValueConverter: __name(() => new ArchitectureValueConverter(), "ValueConverter")
  }
};
function createArchitectureServices(context = EmptyFileSystem) {
  const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
  const Architecture = inject(createDefaultCoreModule({
    shared
  }), ArchitectureGrammarGeneratedModule, ArchitectureModule);
  shared.ServiceRegistry.register(Architecture);
  return {
    shared,
    Architecture
  };
}
__name(createArchitectureServices, "createArchitectureServices");

export {
  ArchitectureModule,
  createArchitectureServices
};
//# sourceMappingURL=chunk-H3M72AB5.js.map
