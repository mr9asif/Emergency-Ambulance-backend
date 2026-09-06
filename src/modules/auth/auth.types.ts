export interface IRegisterPayload {
  name: string;
  phone: string;
  email: string;
  password: string;
}
export interface IVerifyEmailPayload {
  email: string;
  otp: string;
}
