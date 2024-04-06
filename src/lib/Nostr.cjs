const {
    Nostr_sendSignedEvent,
    Nostr_subscribeToEvents,
    Nostr_unsubscribeFromEvents,
    Nostr_getEvents
} = Host.getFunctions()


class Nostr {

    /**
     * Send a pre-signed event to Nostr
     * @param {object} event 
     * @returns {boolean} true if the event was sent
     */
    static async sendSignedEvent(event) {
        const eventJson = JSON.stringify(event);
        const memEvent = Memory.fromString(eventJson);
        const res = await Nostr_sendSignedEvent(memEvent.offset);
        return res == 1;
    }

    /**
     * Subscribe to events
     * @param {[object]} filters
     * @returns {string} The subscription id
     */
    static async subscribeToEvents(filters) {
        const filterJson = JSON.stringify(filters);
        const memFilter = Memory.fromString(filterJson);
        const subIdOffset = await Nostr_subscribeToEvents(memFilter.offset);
        return Memory.find(subIdOffset).readString();
    }

    /** 
     * Unsubscribe from events
     * @param {string} subId
     * @returns {boolean} true if the subscription was removed 
    */
    static async unsubscribeFromEvents(subId) {
        const memSubId = Memory.fromString(subId);
        return await Nostr_unsubscribeFromEvents(memSubId.offset) == 1;
    }

    /**
     * Get events from a subscription
     * @param {string} subId 
     * @param {number} limit 
     * @returns {[object]} The events
     */
    static async getEvents(subId, limit) {
        if (!limit) limit = 0;
        limit = BigInt(limit);
        const memSubId = Memory.fromString(subId);
        const resOffset = await Nostr_getEvents(memSubId.offset, limit);
        return Memory.find(resOffset).readJsonObject();
    }


}

if (typeof module !== "undefined") module.exports = Nostr;