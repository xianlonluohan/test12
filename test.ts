let tracker = emakefun.createFiveLineTrackerV3(0x50)

serial.writeString("device ID: ");
serial.writeNumber(tracker.getDeviceId());
serial.writeString(", firmware version: ");
serial.writeNumber(tracker.getFirmwareVersion());
serial.writeLine("");

tracker.setHighThreshold(0, 900)
tracker.setHighThreshold(1, 900)
tracker.setHighThreshold(2, 900)
tracker.setHighThreshold(3, 900)
tracker.setHighThreshold(4, 900)

tracker.setLowThreshold(0, 800)
tracker.setLowThreshold(1, 800)
tracker.setLowThreshold(2, 800)
tracker.setLowThreshold(3, 800)
tracker.setLowThreshold(4, 800)


basic.forever(function () {
    serial.writeString("digital values: ")
    serial.writeNumber(tracker.digitalValue(0))
    serial.writeString(", ")
    serial.writeNumber(tracker.digitalValue(1))
    serial.writeString(", ")
    serial.writeNumber(tracker.digitalValue(2))
    serial.writeString(", ")
    serial.writeNumber(tracker.digitalValue(3))
    serial.writeString(", ")
    serial.writeNumber(tracker.digitalValue(4))
    serial.writeString(", analog values: ")
    serial.writeNumber(tracker.analogValue(0))
    serial.writeString(", ")
    serial.writeNumber(tracker.analogValue(1))
    serial.writeString(", ")
    serial.writeNumber(tracker.analogValue(2))
    serial.writeString(", ")
    serial.writeNumber(tracker.analogValue(3))
    serial.writeString(", ")
    serial.writeNumber(tracker.analogValue(4))
    serial.writeLine("")
    basic.pause(200)
})