namespace emakefun {
    /**
     * Simultaneously search for multiple target strings in a serial data stream.
     * @param targets The target string array to be searched for.
    * @param timeout_ms Timeout for waiting for response (milliseconds).
     * @returns Find the index of the target string in the array, return -1 if not found.
     */
    export function multiFindUtil(targets: string[], timeout_ms: number): number {
        if (!targets || targets.length === 0 || timeout_ms < 0) {
            throw "Error: 'multiFindUtil' function, invalid parameters.";
        }
        const byte_targets = targets.map(t => Buffer.fromUTF8(t));
        let offsets: number[] = [];
        for (let i = 0; i < byte_targets.length; i++) {
            offsets.push(0);
        }
        const end_time = input.runningTime() + timeout_ms;
        do {
            const data = serial.readBuffer(1);
            if (!data || data.length === 0) {
                basic.pause(1);
                continue;
            }
            const byte = data[0];
            for (let i = 0; i < byte_targets.length; i++) {
                const target = byte_targets[i];
                let offset = offsets[i];
                if (byte === target[offset]) {
                    offset++;
                    if (offset === target.length) {
                        return i;
                    }
                    offsets[i] = offset;
                    continue;
                }
                if (offset === 0) {
                    continue
                }
                const original_offset = offset
                do {
                    offset--;
                    if (byte !== target[offset]) {
                        continue;
                    }
                    if (offset == 0) {
                        offset++;
                        break;
                    }
                    const offset_diff = original_offset - offset;
                    let i = 0;
                    for (i = 0; i < offset; ++i) {
                        if (target[i] !== target[i + offset_diff]) {
                            break;
                        }
                    }
                    if (i == offset) {
                        offset++;
                        break;
                    }
                } while (offset > 0);
            }

        } while (input.runningTime() < end_time);
        return -1;
    }

    /**
     * Search for a single target string in the serial data stream.
     * @param target The target string to be searched for.
     * @param timeout_ms Timeout for waiting for response (milliseconds).
     * @returns Whether the target string has been found, true: found, false: not found.
     */
    export function singleFindUtil(target: string, timeout_ms: number): boolean {
        if (!target || timeout_ms < 0) {
            throw "Error: 'singleFindUtil' function, invalid parameters.";
        }
        let byte_target = Buffer.fromUTF8(target)
        let offset = 0;

        const end_time = input.runningTime() + timeout_ms;
        do {
            const data = serial.readBuffer(1);
            if (!data || data.length === 0) {
                basic.pause(1);
                continue;
            }
            const byte = data[0];
            if (byte === byte_target[offset]) {
                offset++;
                if (offset === byte_target.length) {
                    return true
                };
                continue
            }
            if (0 === offset) {
                continue;
            }
            const original_offset = offset
            do {
                offset--;
                if (byte !== byte_target[offset]) {
                    continue;
                }
                if (offset == 0) {
                    offset++;
                    break;
                }
                const offset_diff = original_offset - offset
                let i = 0;
                for (i = 0; i < offset; ++i) {
                    if (target[i] !== target[i + offset_diff]) {
                        break;
                    }
                }
                if (i == offset) {
                    offset++;
                    break;
                }
            } while (offset > 0);
        } while (input.runningTime() < end_time)
        return false;
    }

    /**
     * Skip the next character and return true if it matches the target character.
     * @param target Target characters.
     * @param timeout_ms Timeout for waiting for response (milliseconds).
     * @returns Match and skip target characters, true: successful, false: failed.
     */
    export function skipNext(target: string, timeout_ms: number): boolean {
        if (!target || timeout_ms < 0) {
            throw "Error: 'skipNext' function, invalid parameters.";
        }
        const end_time = input.runningTime() + timeout_ms;
        do {
            const data = serial.readBuffer(1);
            if (data && data.length > 0) {
                return data[0] === Buffer.fromUTF8(target)[0];
            }
        } while (input.runningTime() < end_time);
        return false;
    }


    /**
     * Parse integers from serial data streams.
     * @param timeout_ms Timeout for waiting for response (milliseconds).
     * @returns The parsed integer value returns -1 upon timeout or failure.
     */
    export function parseNumber(timeout_ms: number): number {
        if (timeout_ms < 0) {
            throw "Error: 'parseNumber' function, invalid parameters.";
        }

        const end_time = input.runningTime() + timeout_ms;
        let num_str = "";

        do {
            const data = serial.readBuffer(1);
            if (!data || data.length === 0) {
                basic.pause(1);
                continue;
            }
            const char = String.fromCharCode(data[0]);
            if ((char === "-" && num_str === "") || ("0" <= char && char <= "9")) {
                num_str += char;
            } else {
                if (num_str !== "" && num_str !== "-") {
                    return parseInt(num_str);
                }
                return NaN
            }
        } while (input.runningTime() < end_time);
        return NaN;
    }

}