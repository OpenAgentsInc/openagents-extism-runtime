declare module "main" {
    // Extism exports take no params and return an I32
    export function run(): I32;
}

declare module "extism:host" {
    interface user {
        Test_fail(msgOffset: I64): void;
        Test_success(msgOffset: I64): void;

        Job_log(ptr: I64): void;
        Job_get(ptr: I64): I64;
        Job_isDone(ptr: I64): I32;
        Job_newInputEventRef(eventIdPtr: I64, markerPtr: I64, sourceRelayPtr: I64): I64;
        Job_newInputJobRef(jobIdPtr: I64, markerPtr: I64, sourceRelayPtr: I64): I64;
        Job_newInputData(dataPtr: I64, markerPtr: I64): I64;
        Job_newParam(keyPtr: I64, args: I64): I64;
        Job_request(
            runOnPtr: I64,
            maxDuration: I32,
            descriptionOff: I64,
            inputs: I64,
            params: I64
        ): I64;

        Nostr_sendSignedEvent(eventOff: I64): I32;
        Nostr_subscribeToEvents(filtersJsonOffset: I64): I64;
        Nostr_unsubscribeFromEvents(subIdOff: I64): I32;
        Nostr_getEvents(subIdOff: I64, limit: I32): I64;

        Test_fail(msgOffset: I64): I64;
        Test_success(msgOffset: I64): I64;
    }
    
}
