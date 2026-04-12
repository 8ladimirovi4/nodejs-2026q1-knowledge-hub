import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Knowledge Hub p.1 REST API. </br> Please check https://github.com/AlreadyBored/nodejs-assignments/blob/main/assignments-v2/05-kh-rest-api/assignment.md';
  }
}
