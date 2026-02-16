import type { Client as McpClient } from '@modelcontextprotocol/sdk/client/index.js';
import { toKebabCase } from '../utils';

export interface SearchOptions {
  index?: string;
  collection?: string;
  n?: number;
}

export interface SearchResult {
  path: string;
  score: number;
  content?: string;
}

export class QmdClient {
  private readonly mcpClient: McpClient;

  constructor(mcpClient: McpClient) {
    this.mcpClient = mcpClient;
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    const result = await this.mcpClient.callTool({
      name: 'qmd_search',
      arguments: {
        query,
        ...(options.index && { index: options.index }),
        ...(options.collection && { collection: options.collection }),
        n: options.n,
      },
    });

    return (result.content as SearchResult[]) ?? [];
  }

  async vectorSearch(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    const result = await this.mcpClient.callTool({
      name: 'qmd_vector_search',
      arguments: {
        query,
        ...(options.index && { index: options.index }),
        ...(options.collection && { collection: options.collection }),
        n: options.n,
      },
    });

    return (result.content as SearchResult[]) ?? [];
  }

  getIndexName(projectRoot: string): string {
    if (!projectRoot || projectRoot.trim() === '') {
      throw new Error(
        'Invalid project root: projectRoot must be a non-empty string',
      );
    }

    const folderName = projectRoot.split('/').pop();

    if (!folderName || folderName.trim() === '') {
      throw new Error(
        'Invalid project root: cannot extract folder name from path',
      );
    }

    return toKebabCase(folderName);
  }
}

/**
 * Stub QmdClient for when MCP client is not yet available.
 * Returns helpful error messages instead of failing silently.
 */
export class StubQmdClient extends QmdClient {
  constructor() {
    // Create a minimal stub MCP client that throws helpful errors
    const stubMcpClient = {
      callTool: async () => {
        throw new Error(
          'QMD MCP server is not connected. Please ensure the QMD MCP server is running.',
        );
      },
    } as any;
    super(stubMcpClient);
  }

  async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
    return [
      {
        path: 'qmd-not-connected',
        score: 0,
        content:
          'QMD MCP server is not connected. Memory search is not available.',
      },
    ];
  }

  async vectorSearch(
    query: string,
    options: SearchOptions,
  ): Promise<SearchResult[]> {
    return [
      {
        path: 'qmd-not-connected',
        score: 0,
        content:
          'QMD MCP server is not connected. Memory search is not available.',
      },
    ];
  }
}
