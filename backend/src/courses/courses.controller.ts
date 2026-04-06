import { Controller, Get, Post, Body } from '@nestjs/common';
import { CoursesService } from './courses.service';

@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Post('enrollments')
  getEnrollments(@Body() body: any) {
    return this.coursesService.getEnrollments(body.token);
  }

  @Post('enroll')
  enrollCourse(@Body() body: any) {
    return this.coursesService.enrollCourse(body.token, body.inviteCode);
  }
}