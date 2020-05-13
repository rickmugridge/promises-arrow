import {SlidingWindow, SlidingWindowProducer} from "./SlidingWindow";
import {Thespian, TMocked} from "thespian";
import {assertThat} from "mismatched";
import {promises} from "./promises";

describe('SlidingWindow:', () => {
    let thespian: Thespian;
    let producer: TMocked<SlidingWindowProducer>;
    let inFlight: SlidingWindow;

    beforeEach(() => {
        thespian = new Thespian();
        producer = thespian.mock<SlidingWindowProducer>('producer');
        inFlight = promises.slidingWindow("topic", producer.object, m => console.log(m), 2);
    });

    it('One message end-to-end', () => {
        let sentCount = 0;
        producer
            .setup(p => p.startDeliveryPolling()).returnsVoid();
        producer
            .setup(p => p.stopDeliveryPolling()).returnsVoid();
        const inFlightPromise = inFlight.send(() => sentCount += 1);
        return deliverAfterDelay(1)
            .then(() => inFlightPromise)
            .then(() => assertThat(sentCount).is(1))
            .then(() => thespian.verify());
    });

    it('Two messages end-to-end', () => {
        let sentCount = 0;
        const times = 2;
        producer
            .setup(p => p.startDeliveryPolling()).returnsVoid()
            .times(times);
        const inFlightPromise = promises.forEach([1, 2], () =>
            inFlight.send(() => sentCount += 1));
        producer
            .setup(p => p.stopDeliveryPolling()).returnsVoid()
            .times(times);
        return deliverAfterDelay(times)
            .then(() => inFlightPromise)
            .then(() => assertThat(sentCount).is(times))
            .then(() => thespian.verify());
    });

    it('Two messages end-to-end, in parallel', () => {
        let sentCount = 0;
        producer
            .setup(p => p.startDeliveryPolling()).returnsVoid();
        const inFlightPromise = Promise.all([
            inFlight.send(() => sentCount += 1),
            inFlight.send(() => sentCount += 1)]);
        producer
            .setup(p => p.stopDeliveryPolling()).returnsVoid();
        return deliverAfterDelay(2)
            .then(() => inFlightPromise)
            .then(() => assertThat(sentCount).is(2))
            .then(() => thespian.verify());
    });

    it('5 messages end-to-end', () => {
        let sentCount = 0;
        const times = 5;
        producer
            .setup(p => p.startDeliveryPolling()).returnsVoid()
            .times(times);
        const inFlightPromise = promises.forEach([1, 2, 3, 4, 5], () =>
            inFlight.send(() => sentCount += 1));
        producer
            .setup(p => p.stopDeliveryPolling()).returnsVoid()
            .times(times);
        return deliverAfterDelay(times)
            .then(() => inFlightPromise)
            .then(() => assertThat(sentCount).is(times))
            .then(() => thespian.verify());
    });

    it('5 messages end-to-end in parallel', () => {
        let sentCount = 0;
        producer
            .setup(p => p.startDeliveryPolling()).returnsVoid();
        const inFlightPromise = Promise.all([
            inFlight.send(() => sentCount += 1),
            inFlight.send(() => sentCount += 1),
            inFlight.send(() => sentCount += 1),
            inFlight.send(() => sentCount += 1),
            inFlight.send(() => sentCount += 1)]);
        producer
            .setup(p => p.stopDeliveryPolling()).returnsVoid();
        return deliverAfterDelay(5)
            .then(() => inFlightPromise)
            .then(() => assertThat(sentCount).is(5))
            .then(() => thespian.verify());
    });

    it('Two messages end-to-end, with first having an error on delivery', () => {
        let sentCount = 0;
        let failedCount = 0;
        const times = 2;
        producer
            .setup(p => p.startDeliveryPolling()).returnsVoid()
            .times(times);
        const inFlightPromise = inFlight
            .send(() => sentCount += 1)
            .catch(e => failedCount += 1)
            .then(() => inFlight.send(() => sentCount += 1));
        producer
            .setup(p => p.stopDeliveryPolling()).returnsVoid()
            .times(times);
        return deliverTwoAfterDelayFirstFailing()
            .then(() => inFlightPromise)
            .then(() => assertThat(sentCount).is(times))
            .then(() => assertThat(failedCount).is(1))
            .then(() => thespian.verify());
    });

    function deliverAfterDelay(times: number): Promise<any> {
        return promises.for(0, times, 1, () =>
            delay()
                .then(() => inFlight.delivery(undefined, "")));
    }

    function deliverTwoAfterDelayFirstFailing(): Promise<any> {
        return delay()
            .then(() => inFlight.delivery("error", undefined))
            .then(() => delay())
            .then(() => inFlight.delivery(undefined, ""));
    }

    function delay() {
        return promises.waitForPromise(2);
    }
});