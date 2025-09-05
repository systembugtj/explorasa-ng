# Debugging Guide for Explorasa-NG

## Development Mode Debugging

The application now uses modern Chrome DevTools for debugging instead of the deprecated Devtron.

### Available Debugging Tools

1. **Built-in Chrome DevTools**
   - Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows/Linux) to open DevTools
   - Full Chrome debugging capabilities including:
     - Console for logging and JavaScript execution
     - Elements inspector for DOM manipulation
     - Network tab for monitoring requests
     - Sources tab for breakpoints and debugging
     - Performance profiling
     - Memory analysis

2. **Main Process Debugging**
   - Use `console.log()` statements in main process files
   - Check terminal output for main process logs
   - Use Node.js debugging tools if needed

3. **Renderer Process Debugging**
   - Use browser DevTools (F12) for renderer process
   - Angular DevTools available in browser
   - Console logging and breakpoints work normally

### Running in Debug Mode

```bash
# Start development server with debugging
npm run test

# Or use the build script
./build.sh
npm run test
```

### Best Practices

1. **Console Logging**: Use `console.log()`, `console.warn()`, `console.error()` for debugging
2. **Breakpoints**: Set breakpoints in DevTools Sources tab
3. **Network Monitoring**: Use Network tab to debug API calls
4. **Performance**: Use Performance tab to identify bottlenecks
5. **Memory Leaks**: Use Memory tab to detect memory issues

### Troubleshooting

- If DevTools don't open, try right-clicking and selecting "Inspect Element"
- For main process debugging, check terminal output
- Redux DevTools extension is optional and not required for debugging