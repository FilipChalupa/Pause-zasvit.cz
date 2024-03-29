import * as WebSocket from 'ws'
import { Countdown } from './Countdown'
import { ScreenHandler } from './ScreenHandler'

export class ConfigHandler {
	protected wsServer: WebSocket.Server
	protected wsScreen: WebSocket.Server
	protected wsClient: WebSocket.Server

	constructor(
		wsServer: WebSocket.Server,
		countdown: Countdown,
		updateInvolvedDuration: (duration: number) => void,
		screenHandler: ScreenHandler,
		wsScreen: WebSocket.Server,
		wsClient: WebSocket.Server
	) {
		this.wsServer = wsServer
		this.wsScreen = wsScreen
		this.wsClient = wsClient

		wsServer.on('connection', (ws: WebSocket) => {
			setTimeout(this.broadcastConnectedCounts, 3000)

			ws.on('message', (message) => {
				const data = JSON.parse(message.toString())
				switch (data.command) {
					case 'timer-set':
						countdown.set(data.value)
						break
					case 'timer-start':
						countdown.start()
						break
					case 'timer-pause':
						countdown.pause()
						break
					case 'timer-stop':
						countdown.stop()
						break
					case 'involved-duration':
						updateInvolvedDuration(data.value)
						break
					case 'building-visible':
						if (data.value) {
							screenHandler.showBuilding()
						} else {
							screenHandler.hideBuilding()
						}
						break
					case 'building-only':
						if (data.value) {
							screenHandler.showBuildingOnly()
						} else {
							screenHandler.hideBuildingOnly()
						}
						break
					case 'entrance-visible':
						if (data.value) {
							screenHandler.showEntrance()
						} else {
							screenHandler.hideEntrance()
						}
						break
					case 'involved-restart':
						screenHandler.restartInvolved()
					case 'plant-flower':
						screenHandler.plantFlower(data.lifeDuration, data.x, data.y)
						break
				}
			})
		})
		this.watchConnected()
	}

	protected watchConnected() {
		const servers = [
			{
				ws: this.wsServer,
				callback: this.updateConnectedConfigs,
			},
			{
				ws: this.wsScreen,
				callback: this.updateConnectedScreens,
			},
			{
				ws: this.wsClient,
				callback: this.updateConnectedClients,
			},
		]

		servers.forEach((server) => {
			server.ws.on('connection', (ws: WebSocket) => {
				server.callback()
				ws.on('close', server.callback)
			})
		})
	}

	public updateConnectedClients = () => {
		this.broadcast({
			command: 'connected-clients',
			value: this.countConnected(this.wsClient),
		})
	}

	public updateConnectedScreens = () => {
		this.broadcast({
			command: 'connected-screens',
			value: this.countConnected(this.wsScreen),
		})
	}

	protected updateConnectedConfigs = () => {
		this.broadcast({
			command: 'connected-configs',
			value: this.countConnected(this.wsServer),
		})
	}

	protected countConnected = (wsServer: WebSocket.Server) => {
		let count = 0
		wsServer.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				count++
			}
		})
		return count
	}

	protected broadcastConnectedCounts = () => {
		this.updateConnectedClients()
		this.updateConnectedScreens()
		this.updateConnectedConfigs()
	}

	protected broadcast(data: any) {
		this.wsServer.clients.forEach((client) => {
			if (client.readyState === WebSocket.OPEN) {
				this.sendData(client, data)
			}
		})
	}

	protected sendData(client: WebSocket, data: any) {
		client.send(JSON.stringify(data))
	}
}
