// MCP types following oh-my-opencode-slim pattern

export type RemoteMcpConfig = {
  type: 'remote';
  url: string;
  headers?: Record<string, string>;
  oauth?: false;
};

export type LocalMcpConfig = {
  type: 'local';
  command: string[];
  environment?: Record<string, string>;
};

export type McpConfig = RemoteMcpConfig | LocalMcpConfig;

export type McpName = 'serena';
