import * as moment from "moment";

export interface Taxameter {
    startAt: moment.Moment;
    endAt: moment.Moment;
    taxameterPrice: number;
    taxameterPriceLength: number;
    taxameterTime: number;
    amount_before_credit: number;
}
