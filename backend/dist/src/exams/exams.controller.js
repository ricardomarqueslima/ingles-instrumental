"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExamsController = void 0;
const common_1 = require("@nestjs/common");
const exams_service_1 = require("./exams.service");
const jwt_1 = require("@nestjs/jwt");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let ExamsController = class ExamsController {
    examsService;
    jwtService;
    constructor(examsService, jwtService) {
        this.examsService = examsService;
        this.jwtService = jwtService;
    }
    submitExam(body) {
        try {
            const decoded = this.jwtService.verify(body.token);
            return this.examsService.submitExam(decoded.sub, body.cursoId, body.modulo, body.respostas, body.tempoGasto);
        }
        catch (e) {
            return { success: false, error: 'Sessão inválida ou expirada.' };
        }
    }
    getExamData(cursoId, modulo) {
        console.log(`\n[ExamsController] Solicitando prova: ${cursoId} módulo ${modulo}`);
        let filePath = path.join(process.cwd(), '..', 'exams', cursoId, `exam${modulo}.json`);
        if (!fs.existsSync(filePath)) {
            filePath = path.join(__dirname, '..', '..', '..', 'exams', cursoId, `exam${modulo}.json`);
        }
        if (!fs.existsSync(filePath)) {
            filePath = path.join(process.cwd(), '..', `exam${modulo}.json`);
        }
        if (!fs.existsSync(filePath)) {
            console.log(`[ExamsController] ❌ Arquivo não encontrado: ${filePath}`);
            return { error: `Arquivo da prova não encontrado no caminho:\n${filePath}` };
        }
        try {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const cleanContent = fileContent.replace(/^\uFEFF/, '');
            const parsed = JSON.parse(cleanContent);
            if (parsed.questions) {
                parsed.questions = parsed.questions.map((q) => {
                    const safeQ = { ...q };
                    delete safeQ.correctAnswer;
                    delete safeQ.correctAnswers;
                    delete safeQ.correctMapping;
                    if (safeQ.statements) {
                        safeQ.statements = safeQ.statements.map((st) => {
                            const safeSt = { ...st };
                            delete safeSt.isCorrect;
                            return safeSt;
                        });
                    }
                    return safeQ;
                });
            }
            console.log(`[ExamsController] ✅ Prova enviada com sucesso (Gabarito Oculto)!`);
            return parsed;
        }
        catch (e) {
            console.error(`[ExamsController] ❌ Erro de formatação no arquivo JSON:`, e);
            return { error: 'O arquivo da prova existe, mas possui erros de formatação no JSON.' };
        }
    }
};
exports.ExamsController = ExamsController;
__decorate([
    (0, common_1.Post)('submit'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "submitExam", null);
__decorate([
    (0, common_1.Get)('data/:cursoId/:modulo'),
    __param(0, (0, common_1.Param)('cursoId')),
    __param(1, (0, common_1.Param)('modulo')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExamsController.prototype, "getExamData", null);
exports.ExamsController = ExamsController = __decorate([
    (0, common_1.Controller)('exams'),
    __metadata("design:paramtypes", [exams_service_1.ExamsService,
        jwt_1.JwtService])
], ExamsController);
//# sourceMappingURL=exams.controller.js.map