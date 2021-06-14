import { HeartbeatSender, HeartbeatSenderEvents } from "../HeartbeatSender";
import { ApiClient } from "../ApiClient";
import Axios from "axios";
import { HeartbeatFailedError } from "../Errors";

jest.useFakeTimers();

describe("HeartbeatSender", () => {
  const instanceId = "abc123";
  const heartbeatInterval = 5_000;

  let apiClient: ApiClient;
  let heartbeatSender: HeartbeatSender;

  beforeEach(() => {
    apiClient = new ApiClient("", "");
    heartbeatSender = new HeartbeatSender(
      instanceId,
      apiClient,
      heartbeatInterval
    );
  });

  it("sends a heartbeat at the specified interval", async () => {
    let resolve: () => void;
    const p = new Promise<void>((r) => (resolve = r));

    jest.spyOn(global, "setTimeout");

    jest
      .spyOn(apiClient, "sendInstanceHeartbeatWithRetries")
      .mockReturnValue(p);

    heartbeatSender.start();

    expect(apiClient.sendInstanceHeartbeatWithRetries).toHaveBeenCalledTimes(1);
    expect(apiClient.sendInstanceHeartbeatWithRetries).toHaveBeenCalledWith(
      instanceId,
      {
        cancelToken: expect.any(Axios.CancelToken),
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    resolve!();
    await p;
    // A second resolve here to let node.js execute code in the "finally"
    // handler of the promise.
    await Promise.resolve();

    expect(setTimeout).toHaveBeenCalledTimes(1);

    // After advancing the timer by less than the heartbeat interval, we should not
    // see any new calls made to the API.
    jest.advanceTimersByTime(heartbeatInterval / 2);
    expect(apiClient.sendInstanceHeartbeatWithRetries).toHaveBeenCalledTimes(1);
    // After advancing the timer by the heartbeat interval, we should see the new call.
    jest.advanceTimersByTime(heartbeatInterval / 2);
    expect(apiClient.sendInstanceHeartbeatWithRetries).toHaveBeenCalledTimes(2);

    // After stopping the HeartbeatSender, and advancing timers by more than the heartbeat
    // interval, we should not see any more calls to the API.
    heartbeatSender.stop();
    jest.advanceTimersByTime(heartbeatInterval * 2);
    expect(apiClient.sendInstanceHeartbeatWithRetries).toHaveBeenCalledTimes(2);
  });

  it("emits a HeartbeatFailed event when the heartbeat fails to send", async () => {
    let eventCount = 0;
    let reject: (err: Error) => void;
    const p = new Promise<void>((_, r) => (reject = r));

    jest
      .spyOn(apiClient, "sendInstanceHeartbeatWithRetries")
      .mockReturnValue(p);

    heartbeatSender.events.on(HeartbeatSenderEvents.HeartbeatFailed, () => {
      eventCount++;
    });

    heartbeatSender.start();

    expect(eventCount).toBe(0);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    reject!(new HeartbeatFailedError("test"));
    await expect(p).rejects.toBeInstanceOf(HeartbeatFailedError);

    expect(eventCount).toBe(1);
  });
});
