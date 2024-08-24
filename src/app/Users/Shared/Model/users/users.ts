export class User {
    constructor(
        public id: string,
        public isSubscribed: boolean,
        public uname: string,
        public address: string,
        public phone_number: string,
        public email: string,
        public password: string,
        public otp?: string
    ) {
    }
}
