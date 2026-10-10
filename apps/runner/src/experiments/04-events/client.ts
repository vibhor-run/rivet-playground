import { createClient } from "rivetkit/client";
import type { registry } from "../../registry";

const clientA = createClient<typeof registry>("http://127.0.0.1:6430");
const clientB = createClient<typeof registry>("http://127.0.0.1:6430");
const key = process.argv[2] ?? "lesson-4-events";
try {
  console.log("Shared actor key:", key);
  const connectionA = clientA.counter.getOrCreate([key]).connect();
  console.log("A initial count:", await connectionA.getCount());
  const connectionB = clientB.counter.getOrCreate([key]).connect();
  const eventsA: number[] = [];
  const eventsB: number[] = [];
  const firstA = Promise.withResolvers<number>();
  const firstB = Promise.withResolvers<number>();

  connectionA.on("countChanged", (count) => {
    if (typeof count !== "number") throw new Error("Expected a numeric count event");
    eventsA.push(count);
    console.log("A received countChanged:", count);
    firstA.resolve(count);
  });
  connectionB.on("countChanged", (count) => {
    if (typeof count !== "number") throw new Error("Expected a numeric count event");
    eventsB.push(count);
    console.log("B received countChanged:", count);
    firstB.resolve(count);
  });
  console.log("B initial count:", await connectionB.getCount());

  const firstResult = await connectionA.increment();
  console.log("A increment returned:", firstResult);
  const received = await Promise.all([firstA.promise, firstB.promise]);
  if (received.some((count) => count !== firstResult)) {
    throw new Error("Expected both clients to receive the incremented count");
  }

  await connectionB.dispose();
  console.log("B disconnected");

  const secondA = Promise.withResolvers<number>();
  connectionA.once("countChanged", (count) => {
    if (typeof count !== "number") {
      secondA.reject(new Error("Expected a numeric count event"));
      return;
    }
    secondA.resolve(count);
  });
  const secondResult = await connectionA.increment();
  console.log("A increment returned:", secondResult);
  const secondReceived = await secondA.promise;
  if (secondReceived !== secondResult || eventsB.length !== 1) {
    throw new Error("Expected only A to receive the second event");
  }

  console.log("A received:", eventsA);
  console.log("B received:", eventsB);
} finally {
  await clientA.dispose();
  await clientB.dispose();
}
