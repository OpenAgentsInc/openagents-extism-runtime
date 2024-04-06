declare module "main" {
    export function run(): I32;
}

declare module "extism:host" {
    interface user {
        Job_log(ptr: I64): void;
        Job_get(ptr: I64): I64;
        Job_isDone(ptr: I64): I64;
        Job_newInputEventRef(eventIdPtr: I64, markerPtr: I64, sourceRelayPtr: I64): I64;
        Job_newInputJobRef(jobIdPtr: I64, markerPtr: I64, sourceRelayPtr: I64): I64;
        Job_newInputData(dataPtr: I64, markerPtr: I64): I64;
        Job_newParam(keyPtr: I64, args: I64): I64;
        Job_request(req: I64): I64;

        Nostr_sendSignedEvent(eventOff: I64): I64;
        Nostr_subscribeToEvents(filtersJsonOffset: I64): I64;
        Nostr_unsubscribeFromEvents(subIdOff: I64): I64;
        Nostr_getEvents(subIdOff: I64, limit: I64): I64;
    }
}
