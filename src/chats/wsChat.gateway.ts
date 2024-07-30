import { OnGatewayConnection, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

@WebSocketGateway({})
export class WsChatGateway implements OnGatewayConnection {
    @WebSocketServer()
    server: Server

    handleConnection(client: Socket) {
        const { room } = client.handshake.headers

        if (!room) {
            client.disconnect()
            return
        }

        client.join(room)
    }
}
