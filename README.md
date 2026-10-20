# ble-packet

Plan Bluetooth Low Energy writes and put notification fragments back together. No radio and no vendor command table: you already have a connection, this only does the bytes.

ATT MTU 23 means each write can carry 20 bytes. A 50 KB firmware image is thousands of writes. This package splits that image, checks CRC-16/CCITT-FALSE (`"123456789"` → `0x29B1`), and reassembles notify frames.

```js
import { planWrites, crc16CcittFalse, encodeNotify, NotifyReassembler } from "ble-packet";

const chunks = planWrites(firmware, { mtu: 185 });
const crc = crc16CcittFalse(firmware);

const rx = new NotifyReassembler();
for (const frame of incoming) {
  const done = rx.push(frame);
  if (done && crc16CcittFalse(done) === expected) apply(done);
}

encodeNotify(part, false); // bit 0 of byte 0 is 0
encodeNotify(part, true);  // bit 0 of byte 0 is 1, last fragment
```

Notification layout used here: the first byte is flags, bit 0 means “last fragment”, and the rest is payload. Match that on the firmware side, or only use `planWrites` if your device already has its own framing.

## A checked split

50 bytes at MTU 23 become writes of 20, 20, and 10. `crc16CcittFalse("123456789")` is `0x29b1`. Both are asserted by `npm test`.

## Out of scope

No scanning, pairing, or vendor command tables. The app that already holds the connection stays in charge of those.

```bash
npm test
```

## License

MIT © Song Xiangrong
