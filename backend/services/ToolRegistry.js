/**
 * ToolRegistry - Version-aware tool metadata storage
 * Uses composite key: `${slug}:${version}` for strict version routing
 */
class ToolRegistry {
  constructor() {
    // Map of `slug:version` -> tool config
    this.tools = new Map();
    // Index of slug -> version[] for quick version lookup
    this.slugVersions = new Map();
  }

  /**
   * Parse toolKey into slug and version
   * @param {string} toolKey - Format: "slug:version" or "slug" (defaults to v1)
   * @returns {{ slug: string, version: string, key: string }}
   */
  parseToolKey(toolKey) {
    if (!toolKey || typeof toolKey !== 'string') {
      throw new Error('toolKey must be a non-empty string');
    }

    const parts = toolKey.split(':');
    
    if (parts.length === 1) {
      // No version specified - will default to latest
      return { slug: parts[0], version: null, key: null };
    }
    
    if (parts.length === 2) {
      const [slug, version] = parts;
      if (!slug || !version) {
        throw new Error('Invalid toolKey format. Expected "slug:version"');
      }
      return { slug, version, key: `${slug}:${version}` };
    }

    throw new Error(`Invalid toolKey format: "${toolKey}". Expected "slug:version"`);
  }

  /**
   * Build composite key
   * @param {string} slug
   * @param {string} version
   * @returns {string}
   */
  buildKey(slug, version) {
    return `${slug}:${version}`;
  }

  /**
   * Register a tool with its metadata
   * @param {object} toolConfig - Tool configuration
   * @param {string} toolConfig.slug - Unique tool identifier (e.g., "emi_calculator")
   * @param {string} toolConfig.type - Engine type (calculator, pdf, image, document)
   * @param {string} [toolConfig.version='v1'] - Tool version (e.g., "v1", "v2")
   * @param {string} toolConfig.name - Display name
   * @param {string} [toolConfig.description] - Tool description
   * @param {array} [toolConfig.categories] - Categories for grouping
   * @param {object} [toolConfig.config] - Input/output config
   * @param {boolean} [toolConfig.active=true] - Is tool active
   */
  registerTool(toolConfig) {
    if (!toolConfig.slug) {
      throw new Error('Tool config must have a slug');
    }
    if (!toolConfig.type) {
      throw new Error(`Tool ${toolConfig.slug} must have a type`);
    }

    const version = toolConfig.version || 'v1';
    const key = this.buildKey(toolConfig.slug, version);

    const tool = {
      slug: toolConfig.slug,
      type: toolConfig.type,
      version: version,
      name: toolConfig.name || toolConfig.slug,
      description: toolConfig.description || '',
      categories: toolConfig.categories || [],
      config: toolConfig.config || { inputs: [], outputs: [] },
      active: toolConfig.active !== false,
      requiresAuth: Boolean(toolConfig.requiresAuth),
      requiredPlan: toolConfig.requiredPlan || 'free',
      requiredRole: toolConfig.requiredRole || 'user',
      dailyLimitFree: toolConfig.dailyLimitFree || null,
      registeredAt: new Date().toISOString()
    };

    // Store with composite key
    this.tools.set(key, tool);

    // Update version index
    if (!this.slugVersions.has(toolConfig.slug)) {
      this.slugVersions.set(toolConfig.slug, []);
    }
    const versions = this.slugVersions.get(toolConfig.slug);
    if (!versions.includes(version)) {
      versions.push(version);
      versions.sort(); // Keep versions sorted
    }

    return tool;
  }

  /**
   * Get tool by slug and exact version
   * @param {string} slug - Tool slug
   * @param {string} version - Exact version (e.g., "v1", "v2")
   * @returns {object|undefined} Tool metadata
   */
  getTool(slug, version) {
    if (!version) {
      throw new Error('Version is required for getTool(). Use getLatestVersion() for default behavior.');
    }
    const key = this.buildKey(slug, version);
    return this.tools.get(key);
  }

  /**
   * Get tool by composite key (slug:version)
   * @param {string} key - Composite key (e.g., "emi_calculator:v1")
   * @returns {object|undefined} Tool metadata
   */
  getToolByKey(key) {
    const { slug, version, key: parsedKey } = this.parseToolKey(key);
    
    if (!version) {
      throw new Error('Version required in toolKey. Use getLatestVersion() for default.');
    }
    
    return this.tools.get(parsedKey);
  }

  /**
   * Get latest version of a tool (for backward compatibility)
   * @param {string} slug - Tool slug
   * @returns {object|undefined} Latest tool metadata
   */
  getLatestVersion(slug) {
    const versions = this.slugVersions.get(slug);
    if (!versions || versions.length === 0) {
      return undefined;
    }
    const latestVersion = versions[versions.length - 1]; // Last in sorted list is latest
    return this.tools.get(this.buildKey(slug, latestVersion));
  }

  /**
   * Get specific tool or fallback to latest version
   * @param {string} slug - Tool slug
   * @param {string|null} version - Version or null for latest
   * @returns {object|undefined}
   */
  resolveTool(slug, version) {
    if (version) {
      const tool = this.getTool(slug, version);
      if (!tool) {
        return null; // Exact version required - no fallback
      }
      return tool;
    }
    return this.getLatestVersion(slug);
  }

  /**
   * List all available versions for a tool
   * @param {string} slug - Tool slug
   * @returns {string[]} Array of versions
   */
  getVersions(slug) {
    return this.slugVersions.get(slug) || [];
  }

  /**
   * List all registered tools
   * @param {object} [filters] - Optional filters
   * @param {boolean} [filters.active] - Filter by active status
   * @param {string} [filters.type] - Filter by engine type
   * @param {string} [filters.category] - Filter by category
   * @param {boolean} [filters.latestOnly=false] - Return only latest version per tool
   * @returns {object[]} Array of tool metadata
   */
  listTools(filters = {}) {
    let tools = Array.from(this.tools.values());

    if (filters.latestOnly) {
      const latestMap = new Map();
      for (const tool of tools) {
        const existing = latestMap.get(tool.slug);
        if (!existing || tool.version > existing.version) {
          latestMap.set(tool.slug, tool);
        }
      }
      tools = Array.from(latestMap.values());
    }

    if (filters.active !== undefined) {
      tools = tools.filter(t => t.active === filters.active);
    }
    if (filters.type) {
      tools = tools.filter(t => t.type === filters.type);
    }
    if (filters.category) {
      tools = tools.filter(t => t.categories.includes(filters.category));
    }

    return tools;
  }

  /**
   * Check if a tool version exists
   * @param {string} slug - Tool slug
   * @param {string} version - Tool version
   * @returns {boolean}
   */
  hasTool(slug, version) {
    return this.tools.has(this.buildKey(slug, version));
  }

  /**
   * Check if any version of a tool exists
   * @param {string} slug - Tool slug
   * @returns {boolean}
   */
  hasToolAnyVersion(slug) {
    return this.slugVersions.has(slug);
  }

  /**
   * Remove a tool version from registry
   * @param {string} slug - Tool slug
   * @param {string} version - Tool version
   * @returns {boolean} True if removed
   */
  unregisterTool(slug, version) {
    const key = this.buildKey(slug, version);
    const deleted = this.tools.delete(key);

    if (deleted) {
      const versions = this.slugVersions.get(slug);
      if (versions) {
        const idx = versions.indexOf(version);
        if (idx !== -1) {
          versions.splice(idx, 1);
        }
        if (versions.length === 0) {
          this.slugVersions.delete(slug);
        }
      }
    }

    return deleted;
  }

  /**
   * Get tools count
   * @returns {number}
   */
  get count() {
    return this.tools.size;
  }

  /**
   * Get unique tools count (by slug)
   * @returns {number}
   */
  get uniqueCount() {
    return this.slugVersions.size;
  }
}

module.exports = new ToolRegistry();