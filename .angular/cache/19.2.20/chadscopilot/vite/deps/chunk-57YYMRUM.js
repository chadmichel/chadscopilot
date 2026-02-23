import {
  AbstractMermaidTokenBuilder,
  CommonValueConverter,
  EmptyFileSystem,
  MermaidGeneratedSharedModule,
  PacketGrammarGeneratedModule,
  __name,
  createDefaultCoreModule,
  createDefaultSharedCoreModule,
  inject,
  lib_exports
} from "./chunk-34SDZ4XG.js";

// node_modules/@mermaid-js/parser/dist/chunks/mermaid-parser.core/chunk-SJTYNZTY.mjs
var PacketTokenBuilder = class extends AbstractMermaidTokenBuilder {
  static {
    __name(this, "PacketTokenBuilder");
  }
  constructor() {
    super(["packet"]);
  }
};
var PacketModule = {
  parser: {
    TokenBuilder: __name(() => new PacketTokenBuilder(), "TokenBuilder"),
    ValueConverter: __name(() => new CommonValueConverter(), "ValueConverter")
  }
};
function createPacketServices(context = EmptyFileSystem) {
  const shared = inject(createDefaultSharedCoreModule(context), MermaidGeneratedSharedModule);
  const Packet = inject(createDefaultCoreModule({
    shared
  }), PacketGrammarGeneratedModule, PacketModule);
  shared.ServiceRegistry.register(Packet);
  return {
    shared,
    Packet
  };
}
__name(createPacketServices, "createPacketServices");

export {
  PacketModule,
  createPacketServices
};
//# sourceMappingURL=chunk-57YYMRUM.js.map
