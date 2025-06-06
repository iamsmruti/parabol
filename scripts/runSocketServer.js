/**
  Starts up an instance of the stateless GraphQL Executor.
  When you modify a server file, the webpack watcher in
  {@link buildServers} writes the change to {@link ../dev/web}.
  Pm2 reloads this file whenever {@link ../dev/web} changes
*/
try {
  require('../dev/web.js')
} catch (e) {
  console.error(e)
  // webpack has not created the file yet
  // pm2 will restart this process when the file changes
}
