export const APPLICATION_REPOSITORY_CONTRACT = Object.freeze([
  "getState",
  "saveState",
  "resetState"
]);

export function assertRepositoryContract(repository) {
  const missingMethods = APPLICATION_REPOSITORY_CONTRACT.filter((methodName) => {
    return typeof repository[methodName] !== "function";
  });

  if (missingMethods.length > 0) {
    throw new Error(`Repository contract invalid: ${missingMethods.join(", ")}`);
  }
}

/**
 * @typedef {Object} InventoryItem
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {number} packageQuantity
 * @property {string} unitLabel
 * @property {number} packagePrice
 * @property {number} currentStock
 * @property {string} brand
 * @property {string} specification
 */

/**
 * @typedef {Object} ProjectData
 * @property {string} id
 * @property {string} projectName
 * @property {string} clientName
 * @property {string} projectNotes
 * @property {number} laborHours
 * @property {number} hourlyRate
 * @property {Record<string, number>} materialUsage
 */

/**
 * @typedef {Object} ApplicationState
 * @property {string} activeScreen
 * @property {string} activeProjectId
 * @property {InventoryItem[]} inventoryData
 * @property {ProjectData[]} projects
 */
