/**
 * acklo's config template definitions.
 *
 * The config template file (`acklo.config.yml`) is used to specify the details
 * of a configuration that is under management by acklo.
 *
 * A {@link ConfigTemplate} can contain many {@link Configuration}s, which can be used to
 * separate distinct areas of your app that you'd like to configure, for example
 * feature switches and server startup config.
 *
 * @example
 * ```yaml
 * ---
 * version: v1
 * configuration:
 *   - id: app_config
 *     name: App config
 *     description: Key configuration for the app.
 *     properties:
 *       - id: log_level
 *         name: Log level
 *         type: string
 *         default: trace
 *       - id: port
 *         name: Server port
 *         type: number
 *         default: 3000
 *   - id: feature_switches
 *     name: Feature switches
 *     description: Feature switches for the app.
 *     properties:
 *       - id: motd
 *         name: Message of the day
 *         type: string
 *         default: Be good to each other.
 *       - id: new_header
 *         name: Show new header
 *         type: boolean
 *         default: false
 * ```
 *
 * @module
 */
export {
  ConfigTemplate,
  Configuration,
  Property,
} from "./quicktype/ConfigTemplate";
