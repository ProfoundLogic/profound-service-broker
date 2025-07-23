import BaseError from './base-error'

export default class AsyncRequiredError extends BaseError {
  constructor() {
    super(
      'AsyncRequired',
      422,
      'This service plan requires client support for asynchronous service operations.',
    )
  }
}
