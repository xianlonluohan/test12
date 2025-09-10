//%block="Emakefun"
namespace emakefun {

    /**
     * MQTT connection scheme options.
     */
    export enum ConnectionScheme {
        //% block="TCP"
        kMqttOverTcp = 1,
        //% block="TLS (not verifying certificates)"
        kMqttOverTlsNoVerify = 2,
        //% block="TLS (verify server certificate)"
        kMqttOverTlsVerifyServerCert = 3,
        //% block="TLS (provide client certificate)"
        kMqttOverTlsProvideClientCert = 4,
        //% block="TLS (mutual authentication)"
        kMqttOverTlsMutualVerify = 5,
        //% block="WebSocket (Based on TCP)"
        kMqttOverWebSocket = 6,
        //% block="WebSocket (Based on TLS, not verifying certificates)"
        kMqttOverWebSocketSecureNoVerify = 7,
        //% block="WebSocket (Based on TLS, verify server certificate)"
        kMqttOverWebSocketSecureVerifyServerCert = 8,
        //% block="WebSocket (Based on TLS, provide client certificate)"
        kMqttOverWebSocketSecureProvideClientCert = 9,
        //% block="WebSocket (Based on TLS, mutual authentication)"
        kMqttOverWebSocketSecureMutualVerify = 10
    }

    /**
     * Create a new ESP-AT module instance.
     * @param tx_pin TX pin.
     * @param rx_pin RX pin.
     * @param baud_rate Baud rate.
     * @return The new ESP-AT module object.
     */
    //% block="create a new ESP-AT moudle instance, tx $tx_pin, rx $rx_pin, baud rate $baud_rate"
    //% subcategory="EspAtManager"
    //% blockSetVariable=esp_at_manager
    //% tx_pin.defl=SerialPin.P1
    //% rx_pin.defl=SerialPin.P0
    //% baud_rate.defl=BaudRate.BaudRate9600
    //% weight=100
    export function createEspAtManager(
        tx_pin: SerialPin,
        rx_pin: SerialPin,
        baud_rate: BaudRate
    ): EspAtManager {
        return new EspAtManager(tx_pin, rx_pin, baud_rate);
    }

    /**
     * ESP-AT class
     */
    export class EspAtManager {
        /**
         * Send AT command and wait for specific response.
         * @param command The AT command string to be sent (does not need to include carriage returns or line breaks).
         * @param success_target Response string indicating successful command execution.
         * @param timeout_ms Timeout for waiting for response (milliseconds).
         * @returns If receiving a success_target response, return true; otherwise, return false.
         */
        private writeCommand(command: string, success_target: string, timeout_ms: number): boolean {
            if (!command || !success_target || timeout_ms < 0) {
                throw "Error: 'writeCommand' function, invalid parameters.";
            }
            const targets = [success_target, "\r\nERROR\r\n", "busy p...\r\n"];
            serial.writeString(command + "\r\n");
            return emakefun.multiFindUtil(targets, timeout_ms) === 0
        }

        /**
         * Constructor
         * @param tx_pin TX pin.
         * @param rx_pin RX pin.
         * @param baud_rate Baud rate.
         */
        constructor(tx_pin: SerialPin, rx_pin: SerialPin, baud_rate: BaudRate) {
            serial.redirect(tx_pin, rx_pin, baud_rate);

            this.restart(2000);

            const at_commands = [
                "ATE0",
                "AT+CWINIT=1",
                "AT+CWMODE=1",
                "AT+CIPDINFO=1",
                "AT+CWAUTOCONN=0",
                "AT+CWDHCP=1,1"
            ];
            for (let command of at_commands) {
                if (!this.writeCommand(command, "\r\nOK\r\n", 500)) {
                    throw "Error: module init failed.";
                }
            }
        }

        /**
         * Restart ESP-AT module.
         * @param timeout_ms Timeout for waiting for response (milliseconds).
         */
        //% block="$this restart ESP-AT module, timeout %timeout_ms ms"
        //% subcategory="EspAtManager"
        //% group="Manager"
        //% this.defl=esp_at_manager
        //% timeout_ms.min=0
        //% timeout_ms.defl=2000
        //% weight=99
        restart(timeout_ms: number): void {
            const end_time = input.runningTime() + timeout_ms;
            do {
                if (this.writeCommand("AT+RST", "\r\nOK\r\n", 100) && emakefun.singleFindUtil("\r\nready\r\n", 1000)) {
                    if (!this.writeCommand("AT", "\r\nOK\r\n", 100)) {
                        throw "Error: WiFi connection failed.";
                    }
                } else {
                    this.cancelSend();
                }
            } while (input.runningTime() < end_time);
            throw "Error: module restart failed.";
        }

        /**
         * Cancel send.
         */
        //% block="$this cancel send"
        //% subcategory="EspAtManager"
        //% group="Manager"
        //% this.defl=esp_at_manager
        //% weight=98
        cancelSend(): void {
            basic.pause(30);
            serial.writeString("+++")
            if (!emakefun.singleFindUtil("\r\nSEND Canceled\r\n", 100)) {
                serial.writeString("\r\n");
                serial.readString();
                throw "Error: module cancel send failed.";
            }
        }

        /**
         * Connect WiFi.
         * @param ssid Wifi ssid.
         * @param password Wifi password.
         */
        //% block="$this connect to WiFi: SSID $ssid Password $password"
        //% subcategory="EspAtManager"
        //% group="WiFi"
        //% this.defl=esp_at_manager
        //% weight=90
        wifiConnect(ssid: string, password: string): void {
            const command = `AT+CWJAP="${ssid}","${password}"`;
            if (!this.writeCommand(command, "\r\nOK\r\n", 15000)) {
                throw "Error: WiFi connection failed.";
            }
        }

        /**
         * Get the WiFi ip information.
         * @returns The ip, gateway, and netmask information of the current WiFi connection.
         */
        //% block="$this get the WiFi ip information"
        //% subcategory="EspAtManager"
        //% group="WiFi"
        //% this.defl=esp_at_manager
        //% weight=85
        getIpInfo(): { ip: string, gateway: string, netmask: string } {
            if (!this.writeCommand("AT+CIPSTA?", '+CIPSTA:ip:"', 500)) {
                return null;
            }

            const ip = serial.readUntil('"');
            let gateway = "";
            let netmask = "";

            if (emakefun.singleFindUtil('+CIPSTA:gateway:"', 100)) {
                gateway = serial.readUntil('"');
            }
            if (emakefun.singleFindUtil('+CIPSTA:netmask:"', 100)) {
                netmask = serial.readUntil('"');
            }
            if (emakefun.singleFindUtil("\r\nOK\r\n", 100)) {
                return { ip, gateway, netmask };
            }
            return null;
        }

        /**
         * Get the WiFi mac address.
         * @returns The current mac address connected to WiFi.
         */
        //% block="$this get the WiFi mac address"
        //% subcategory="EspAtManager"
        //% group="WiFi"
        //% this.defl=esp_at_manager
        //% weight=80
        getMac(): string {
            if (!this.writeCommand("AT+CIPSTAMAC?", '+CIPSTAMAC:"', 500)) {
                return null;
            }
            const mac = serial.readUntil('"', 500);
            if (emakefun.singleFindUtil("\r\nOK\r\n", 100)) {
                return mac;
            }
            return null;
        }

        /**
         * Get the WiFi ap information.
         * @returns The ap information of the current WiFi connection.
         */
        //% block="$this get the WiFi ap information"
        //% subcategory="EspAtManager"
        //% group="WiFi"
        //% this.defl=esp_at_manager
        //% weight=75
        getApInfo(): { ssid: string, bssid: string, channel: number, rssi: number } {
            if (!this.writeCommand("AT+CWJAP?", '+CWJAP:"', 500)) {
                return null;
            }
            const ssid = serial.readUntil('"');
            if (!emakefun.skipNext(",", 100) ||
                !emakefun.skipNext('"', 100)) {
                return null;
            }
            const bssid = serial.readUntil('"');
            if (!emakefun.skipNext(",", 100)) {
                return null;
            }
            const channel = emakefun.parseNumber(500);
            const rssi = emakefun.parseNumber(500);
            if (isNaN(channel) || isNaN(rssi)) {
                return null;
            }

            if (emakefun.singleFindUtil("\r\nOK\r\n", 100)) {
                return { ssid, bssid, channel, rssi };
            }
            return null;
        }

        /**
         * Set mqtt user properties.
         * @param scheme Mqtt connection scheme.
         * @param client_id Mqtt client ID.
         * @param username Username.
         * @param password Password.
         * @param path Resource path.
         */
        //% block="$this mqtt set user properties: connection scheme $scheme client ID $client_id username $username password $password resource path $path"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% weight=70
        mqttUserConfig(
            scheme: ConnectionScheme = ConnectionScheme.kMqttOverTcp,
            client_id: string,
            username: string,
            password: string,
            path: string
        ): void {
            const command = `AT+MQTTUSERCFG=0,${scheme},"${client_id}","${username}","${password}",0,0,"${path}"`;
            if (!this.writeCommand(command, "\r\nOK\r\n", 500)) {
                throw "Error: mqtt configuration user properties failed.";
            }
        }

        /**
         * Connect to mqtt server.
         * @param host Server host.
         * @param port Server port. 
         * @param reconnect Whether to automatically reconnect, true: mqtt will automatically reconnect, false: mqtt will not automatically reconnect.
         */
        //% block="$this mqtt to connect server: host $host port $port reconnect $reconnect timeout $timeout_ms ms"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% port.min=1
        //% port.max=65535
        //% reconnect.defl=true
        //% weight=65
        mqttConnect(host: string, port: number, reconnect: boolean): void {
            const command = `AT+MQTTCONN=0,"${host}",${port},${reconnect ? 1 : 0}`;
            if (!this.writeCommand(command, "\r\nOK\r\n", 10000)) {
                throw "Error: mqtt connection failed.";
            }
        }

        /**
         * Publish mqtt messages.
         * @param topic Mqtt topic.
         * @param data Mqtt string message data.
         * @param qos QoS level.
         * @param retain Whether to keep the message, true: keep, false: not keep.
         * @param timeout_ms Timeout for waiting for response (milliseconds).
         */
        //% block="$this mqtt publish messages $data to topic $topic, QoS $qos retain $retain timeout %timeout_ms ms"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% qos.min=0 
        //% qos.max=2
        //% qos.defl=0
        //% retain.defl=false
        //% timeout_ms.defl=1000
        //% timeout_ms.min=0
        //% weight=55
        mqttPublish(topic: string, data: string, qos: number, retain: boolean, timeout_ms: number): void {
            const data_bytes = Buffer.fromUTF8(data);
            const command = `AT+MQTTPUBRAW=0,"${topic}",${data_bytes.length},${qos},${retain ? 1 : 0}`;
            if (!this.writeCommand(command, "\r\nOK\r\n\r\n>", 500)) {
                throw "Error: mqtt publish content failed.";
            }
            const targets = ["+MQTTPUB:OK", "+MQTTPUB:FAIL"];
            serial.writeBuffer(data_bytes);
            if (emakefun.multiFindUtil(targets, timeout_ms) !== 0) {
                throw "Error: mqtt publish content failed.";
            }
        }

        /**
         * Subscribe to mqtt topic.
         * @param topic Mqtt topic.
         * @param qos QoS level.
         */
        //% block="$this mqtt subscribe topic $topic, QoS $qos"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% qos.min=0
        //% qos.max=2
        //% qos.defl=0
        //% weight=50
        mqttSubscribe(topic: string, qos: number): void {
            const command = `AT+MQTTSUB=0,"${topic}",${qos}`;
            if (!this.writeCommand(command, "\r\nOK\r\n", 500)) {
                throw "Error: mqtt subscription failed.";
            }
        }

        /**
         * Unsubscribe from mqtt topic.
         * @param topic Mqtt topic.
         */
        //% block="$this mqtt unsubscribe topic $topic"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% weight=45
        mqttUnsubscribe(topic: string): void {
            const command = `AT+MQTTUNSUB=0,"${topic}"`;
            if (!this.writeCommand(command, "\r\nOK\r\n", 500)) {
                throw "Error: mqtt unsubscription failed.";
            }

        }

        /**
         * Disconnect mqtt connection.
         */
        //% block="$this mqtt disconnect connection"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% weight=40
        mqttDisconnect(): void {
            if (!this.writeCommand("AT+MQTTCLEAN=0", "\r\nOK\r\n", 500)) {
                throw "Error: mqtt disconnect failed.";
            }
        }

        /**
         * Receive mqtt messages.
         * @param timeout_ms Timeout for waiting for response (milliseconds).
         * @returns Return an object containing topic and message string. If failed, topic is empty and message is empty string.
         */
        //% block="$this mqtt receive messages, timeout $timeout_ms"
        //% subcategory="EspAtManager"
        //% group="MQTT"
        //% this.defl=esp_at_manager
        //% timeout_ms.defl=100
        //% timeout_ms.min=0
        //% weight=35
        mqttReceive(timeout_ms: number): { topic: string, message: string } {
            if (!emakefun.singleFindUtil('+MQTTSUBRECV:0,"', timeout_ms)) {
                return null;
            }
            const topic = serial.readUntil('"');

            if (!emakefun.skipNext(",", 100)) {
                return null;
            }
            const length = emakefun.parseNumber(500);
            if (isNaN(length) || length <= 0) {
                return null;
            }

            const end_time = input.runningTime() + 300;

            let received_data = "";
            let received_data_length = 0;
            while (received_data_length < length && input.runningTime() < end_time) {
                const data = serial.readBuffer(length - received_data_length);
                if (data && data.length > 0) {
                    received_data += data.toString();
                    received_data_length += data.length;
                }
            }

            if (received_data_length < length) {
                return null;
            }

            return { topic: topic, message: received_data };
        }
    }
}