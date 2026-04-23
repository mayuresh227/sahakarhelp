class ToolRegistry {
    constructor() {
        this.tools = new Map();
        this.engines = new Map();
    }

    registerTool(toolMetadata) {
        this.tools.set(toolMetadata.slug, toolMetadata);
    }

    getTool(slug) {
        return this.tools.get(slug);
    }

    registerEngine(engineType, engineInstance) {
        this.engines.set(engineType, engineInstance);
    }

    getEngine(engineType) {
        return this.engines.get(engineType);
    }

    executeTool(slug, inputs) {
        const tool = this.getTool(slug);
        if (!tool) throw new Error(`Tool not found: ${slug}`);

        const engine = this.getEngine(tool.engineType);
        if (!engine) throw new Error(`Engine not found: ${tool.engineType}`);

        return engine.execute(tool, inputs);
    }
}

module.exports = new ToolRegistry();