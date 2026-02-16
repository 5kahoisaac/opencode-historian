import type { LocalMcpConfig } from './types';

export const serena: LocalMcpConfig = {
  type: 'local',
  command: [
    'uvx',
    '--from',
    'git+https://github.com/oraios/serena',
    'serena',
    'start-mcp-server',
    '--context',
    'ide-assistant',
    '--open-web-dashboard',
    'False',
  ],
};
