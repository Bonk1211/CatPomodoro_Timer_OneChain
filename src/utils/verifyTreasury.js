// Utility to verify treasury object exists on blockchain

import { useSuiClient } from '@onelabs/dapp-kit'

/**
 * Verify if treasury object exists on blockchain
 * @param {string} treasuryId - Treasury object ID
 * @param {Object} client - SuiClient instance
 * @returns {Promise<{exists: boolean, error?: string, data?: any}>}
 */
export const verifyTreasuryExists = async (treasuryId, client) => {
  if (!treasuryId || !treasuryId.startsWith('0x')) {
    return { exists: false, error: 'Invalid treasury ID format' }
  }

  try {
    const object = await client.getObject({
      id: treasuryId,
      options: {
        showType: true,
        showOwner: true,
        showContent: true,
      }
    })

    if (object.error) {
      return { 
        exists: false, 
        error: object.error.code === 'notExists' 
          ? 'Treasury object does not exist on blockchain. Please initialize it first.'
          : object.error.message || 'Unknown error'
      }
    }

    if (object.data) {
      // Verify it's actually a Treasury object
      const objectType = object.data.type
      if (objectType && objectType.includes('Treasury')) {
        return { 
          exists: true, 
          data: object.data,
          type: objectType
        }
      } else {
        return { 
          exists: false, 
          error: `Object exists but is not a Treasury. Type: ${objectType}`
        }
      }
    }

    return { exists: false, error: 'Object not found' }
  } catch (error) {
    console.error('Error verifying treasury:', error)
    return { 
      exists: false, 
      error: error.message || 'Failed to verify treasury object'
    }
  }
}

