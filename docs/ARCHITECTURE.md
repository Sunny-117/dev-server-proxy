# Architecture Documentation

[中文文档](./ARCHITECTURE.zh-CN.md)

This document provides an in-depth look at the technical implementation, architecture, and design patterns used in Dev Server Proxy.

## Table of Contents

- [Overall Architecture](#overall-architecture)
- [Core Modules](#core-modules)
- [Design Patterns](#design-patterns)
- [Data Flow](#data-flow)
- [Technical Highlights](#technical-highlights)

## Overall Architecture

Dev Server Proxy uses a **middleware pattern** design with file watching for hot updates. The core is an Express/Connect-style middleware that intercepts requests and routes them to appropriate handlers.

```
┌─────────────────────────────────────────────────────────┐
│                    webpack-dev-server                    │
└───────────────────────┬─────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────┐
│                  Proxy Middleware                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Request Router (server.ts)                      │  │
│  │  ├─ Log Request → log middleware                 │  │
│  │  ├─ Path Extraction → CUSTOM_API / AJAX_API      │  │
│  │  ├─ Proxy Target → proxy middleware              │  │
│  │  └─ Mock → mock middleware                       │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Log Handler  │ │ Proxy Handler│ │ Mock Handler │
└──────────────┘ └──────────────┘ └──────────────┘
                        │               │
                        ▼               ▼
                ┌──────────────┐ ┌──────────────┐
                │ Remote Server│ │ Local Files  │
                └──────────────┘ └──────────────┘

        ┌─────────────────────────────────┐
        │      Watch System               │
        │  ┌────────────┐ ┌─────────────┐│
        │  │Config Watch│ │Mock Files   ││
        │  │(.devserverrc)│ │Watch       ││
        │  └────────────┘ └─────────────┘│
        └─────────────────────────────────┘
```

## Core Modules

### 1. Entry Module (`index.ts`)

**Responsibilities:**
- Parse startup arguments to determine proxy type (mock/test/staging/production)
- Start configuration and mock file watchers
- Generate webpack devServer configuration object
- Handle compatibility between webpack 4 and webpack 5

**Key Logic:**
```typescript
// 1. Get proxy type from CLI args or env
const type = getServerType(config);

// 2. Start file watchers
startMockWatch(config, type);

// 3. Return different config based on webpack version
if (webpackVersion < 5) {
    return { 
        before(app) { 
            app.use(server(config)); 
        } 
    };
} else {
    return { 
        setupMiddlewares: (middlewares) => {
            middlewares.unshift({
                name: 'proxy mock',
                middleware: server(config)
            });
            return middlewares;
        } 
    };
}
```

### 2. Request Router (`server.ts`)

**Responsibilities:** Core routing logic that determines how requests are handled

**Processing Flow:**
```
Request arrives
  │
  ├─ 1. Is it a log request? (LOG_API)
  │     └─ Yes → log middleware → return
  │
  ├─ 2. Extract API path
  │     ├─ Try CUSTOM_API rules first
  │     └─ Then try AJAX_API + query.path
  │
  ├─ 3. No path extracted?
  │     └─ Yes → next() → pass to next middleware
  │
  ├─ 4. Determine proxy target
  │     ├─ Priority 1: PATH_RULES[path].target
  │     ├─ Priority 2: PATH_RULES[path].proxy
  │     └─ Priority 3: Global PROXY config
  │
  ├─ 5. Has proxy target?
  │     └─ Yes → proxy middleware → return
  │
  └─ 6. Default → mock middleware → return
```

**Key Code:**
```typescript
function getPath(config, parsedUrl) {
    // 1. Try custom rules
    if (CUSTOM_API) {
        for (let api of CUSTOM_API) {
            const customPath = api.rule(parsedUrl);
            if (customPath) return customPath;
        }
    }
    
    // 2. Try standard AJAX_API
    if (AJAX_API.test(parsedUrl.pathname)) {
        return parsedUrl.query.path;
    }
    
    return '';
}
```

### 3. Configuration Watcher (`watchConfig.ts`)

**Responsibilities:** Monitor `.devserverrc` file changes for hot configuration updates

**Implementation:**
```typescript
// 1. Initialize by writing config file
writeServerConfig(configFile, innerConfig);

// 2. Watch file changes using fs.watch
fs.watch(config.WORK_PATH, (event, filename) => {
    if (filename === '.devserverrc') {
        // 3. Re-read and update in-memory config
        innerConfig = JSON.parse(fs.readFileSync(configFile));
    }
});

// 4. Provide get() method for other modules
export const get = () => innerConfig;
```

**Design Highlights:**
- Singleton pattern ensures only one watcher instance
- Configuration stored in memory for fast access
- Supports dynamic modification of specific fields (PROXY, PATH_RULES, etc.)

### 4. Mock File Watcher (`watchMockFiles.ts`)

**Responsibilities:** Monitor mock directory changes for hot mock updates

**Implementation:**
```typescript
// 1. Initialize by scanning directory and building path map
pathMap = getPathMap(mockPath);
// Example: { "api/GET/user/info": "/path/to/api_GET_user_info.js" }

// 2. Watch directory changes (recursive)
fs.watch(mockPath, {recursive: true}, (evt, file) => {
    // 3. Use debounce to avoid frequent updates
    clearTimeout(updateTimer);
    updateTimer = setTimeout(() => {
        // 4. Re-scan directory
        update(getPathMap(mockPath));
        
        // 5. Clear require cache to force reload
        delete require.cache[require.resolve(newFile)];
    }, 100);
});
```

**Design Highlights:**
- Recursive directory watching
- Debounce mechanism to prevent excessive triggers
- Clears Node.js require cache for true hot reloading
- Detects path conflicts when multiple files map to same path

### 5. Mock Middleware (`mock.ts`)

**Responsibilities:** Load and execute local mock files, return simulated data

**Processing Flow:**
```typescript
// 1. Get path map from watchMockFiles
const {pathMap, pathErrors} = watchMockFiles.get();

// 2. Find corresponding mock file
const file = pathMap[path];

// 3. Dynamically load and execute
const func = require(file);
const {status, response} = func(params);

// 4. Return result
res.status(status);
res.send(JSON.stringify(response));
```

**Features:**
- Supports functional mocks that can generate data based on request params
- Automatically parses request parameters (supports querystring and JSON)
- Error handling for missing files, non-functions, execution errors, etc.

### 6. Proxy Middleware (`proxy.ts`)

**Responsibilities:** Forward requests to remote servers

**Implementation:**
```typescript
// 1. Construct target URL
const url = `${target}${req.url}`;

// 2. Handle headers (key: modify origin, referer, host)
const headers = {
    ...req.headers,
    'origin': target,
    'referer': target,
    'host': target.replace(/https?:\/\//, '')
};

// 3. Forward request using request library
request({
    url, 
    headers, 
    method: 'POST', 
    body: req.body
}, (error, response, body) => {
    res.status(200);
    res.send(body);
});
```

**Design Considerations:**
- Modifies request headers to bypass CORS restrictions
- Preserves original request body
- Uses POST method uniformly (adapts to specific backend API conventions)

### 7. Log Middleware (`log.ts`)

**Responsibilities:** Handle frontend log reporting requests

**Special Handling:**
- Supports lz-string compressed log data
- Automatically decompresses and formats output
- Doesn't forward to remote server, processes locally

## Design Patterns

### 1. Middleware Pattern
The entire project is based on Express/Connect middleware pattern:
```typescript
(request, response, next) => {
    if (shouldHandle) {
        // Handle and return
    } else {
        next(); // Pass to next middleware
    }
}
```

### 2. Singleton Pattern
Configuration and file watchers use singleton pattern:
```typescript
let started = false;

export const start = () => {
    if (started) return;
    started = true;
    // Initialization logic
};
```

### 3. Strategy Pattern
Different handling strategies based on conditions:
- Log request → log middleware
- Has proxy target → proxy middleware
- Default → mock middleware

### 4. Observer Pattern
Uses `fs.watch` to monitor file changes, implementing hot updates for configuration and mock files.

## Data Flow

```
┌─────────────┐
│ User Request │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│ server.ts (Main Router)              │
│ 1. Parse URL                         │
│ 2. Read latest config                │
└──────┬──────────────────────────────┘
       │
       ├─ Match LOG_API?
       │    └─ Yes → log.ts → return
       │
       ├─ Extract path
       │    ├─ CUSTOM_API.rule(url)
       │    └─ AJAX_API + query.path
       │
       ├─ No path?
       │    └─ Yes → next() → other middleware
       │
       ├─ Determine target
       │    ├─ PATH_RULES[path].target
       │    ├─ PATH_RULES[path].proxy → config[proxy].target
       │    └─ config[PROXY].target
       │
       ├─ Has target?
       │    └─ Yes → proxy.ts → remote server → return
       │
       └─ Default → mock.ts
                   │
                   ├─ watchMockFiles.get()
                   ├─ Find pathMap[path]
                   ├─ require(file)
                   ├─ func(params)
                   └─ Return mock data
```

## Technical Highlights

### File Watching & Hot Reload

```typescript
// Watch directory
fs.watch(path, {recursive: true}, callback);

// Clear require cache for hot reload
delete require.cache[require.resolve(file)];
```

### Webpack Compatibility

Supports both webpack 4 and webpack 5:

```typescript
// webpack 4
return {
    before(app) {
        app.use(middleware);
    }
};

// webpack 5
return {
    setupMiddlewares: (middlewares) => {
        middlewares.unshift({
            name: 'proxy mock',
            middleware: middleware
        });
        return middlewares;
    }
};
```

### Path Extraction Strategy

Flexible path extraction supporting multiple patterns:
1. Custom API rules (highest priority)
2. Standard AJAX_API pattern
3. Fallback to next middleware

### Configuration Priority

Clear configuration priority system:
1. Path-specific target (PATH_RULES[path].target)
2. Path-specific proxy reference (PATH_RULES[path].proxy)
3. Global proxy configuration (PROXY)

This layered approach provides maximum flexibility while maintaining simplicity.
