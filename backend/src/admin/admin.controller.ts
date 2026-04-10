import { Controller, Post, Body } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('login')
  login(@Body() body: any) { return this.adminService.login(body.email, body.password); }

  @Post('config')
  getConfig(@Body() body: any) { return this.adminService.getConfig(body.token); }

  @Post('students')
  getStudents(@Body() body: any) { return this.adminService.getStudents(body.token, body.cursoId); }

  @Post('grades')
  getAllGrades(@Body() body: any) { return this.adminService.getAllGrades(body.token, body.cursoId); }

  @Post('toggle-module')
  toggleModule(@Body() body: any) {
    return this.adminService.toggleModule(body.token, body.cursoId, body.modulo, body.tipo, body.habilitado);
  }

  @Post('validate-grade')
  validateGrade(@Body() body: any) {
    return this.adminService.validateGrade(body.token, body.cursoId, body.email, body.modulo);
  }

  @Post('update-invite')
  updateInviteCode(@Body() body: any) {
    return this.adminService.updateInviteCode(body.token, body.cursoId, body.newCode);
  }

  @Post('update-password')
  updateAdminPassword(@Body() body: any) {
    return this.adminService.updateAdminPassword(body.token, body.newPassword);
  }

  @Post('delete-grade')
  deleteGrade(@Body() body: any) {
    return this.adminService.deleteGrade(body.token, body.cursoId, body.email, body.modulo);
  }
}