import { NostrConnectorClient as _NostrConnectorClient } from "./proto/rpc.client";
import * as GRPC from "@grpc/grpc-js";
import { GrpcTransport } from "@protobuf-ts/grpc-transport";
import type { UnaryCall } from "@protobuf-ts/runtime-rpc";

export default class NostrConnectorClient extends _NostrConnectorClient {
    constructor(ip, port) {
        super(
            new GrpcTransport({
                host: `${ip}:${port}`,
                channelCredentials: GRPC.ChannelCredentials.createInsecure(),
            })
        );
    }

    async r<T extends object>(c: UnaryCall<object, T> | Promise<UnaryCall<object, T>>):Promise<T> {
        const cc = await c;
        const rpcStatus = await cc.status;
        if ("" + rpcStatus.code != "0") {
            throw new Error(`rpc failed with status ${rpcStatus.code}: ${rpcStatus.detail}`);
        }
        return cc.response;
    }
}
