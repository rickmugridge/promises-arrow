import {DeferredPromise} from "./DeferredPromise";

export class SlidingWindow {
    inFlightPromises: Array<DeferredPromise<any>> = [];
    readyForFlightPromises: Array<DeferredPromise<any>> = [];
    polling = false;

    constructor(protected context: string,
                protected producer: SlidingWindowProducer,
                protected logger: (message: object | string) => void,
                protected maxInFlight = 5) {
    }

    delivery(err, report) {
        if (err) {
            if (this.inFlightPromises.length > 0) {
                this.inFlightPromises.shift()!.reject(err);
            }
            if (this.readyForFlightPromises.length > 0) {
                this.readyForFlightPromises.shift()!.resolve(undefined);
            }
        } else {
            this.logger({
                action: "delivery",
                inFlights: this.inFlightPromises.length,
                readys: this.readyForFlightPromises.length
            }); // todo
            if (this.inFlightPromises.length > 0) {
                this.inFlightPromises.shift()!.resolve(undefined);
                if (this.readyForFlightPromises.length > 0) {
                    this.readyForFlightPromises.shift()!.resolve(undefined);
                }
            } else {
                this.logger({unexpectedDeliveryOn: this.context});
            }
        }
        if (this.inFlightPromises.length === 0) {
            this.logger({aim: "SlidingWindow", status: "Success", report}); // todo
            this.polling = false;
            this.producer.stopDeliveryPolling();
        }
    }

    send(sender: () => any): Promise<any> {
        if (this.inFlightPromises.length < this.maxInFlight) {
            return this.sendNow(sender);
        } else {
            const wait = new DeferredPromise<any>();
            this.readyForFlightPromises.push(wait);
            return wait.promise.then(() => this.sendNow(sender));
        }
    }

    private sendNow(sender: () => any): Promise<any> {
        if (!this.polling) {
            this.polling = true;
            this.logger("start polling"); // todo
            this.producer.startDeliveryPolling();
        }
        const deliveryDeferredPromise = new DeferredPromise<any>();
        this.inFlightPromises.push(deliveryDeferredPromise);
        sender();
        return deliveryDeferredPromise.promise;
    }
}

export interface SlidingWindowProducer {
    startDeliveryPolling();
    stopDeliveryPolling();
}