import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

// 템플릿 메타 정보 인터페이스
export interface Template {
  id: string;
  user_id: string;
  name: string;
  description: string;
  framework: string;
  icon: string;
  created_at: string;
  // 조인 시 함께 로드되는 파일 목록 (선택적)
  template_files?: TemplateFile[];
}

// 템플릿 구성 파일 인터페이스
export interface TemplateFile {
  id: string;
  template_id: string;
  name: string;
  extension: string;
  content: string;
  order_index: number;
}

// 프레임워크별 기본 아이콘 및 브랜드 로고 색상 매핑
const FRAMEWORK_ICONS: Record<string, string> = {
  'Angular': 'bx bxl-angular icon-angular',
  'React.js': 'bx bxl-react icon-react',
  'React': 'bx bxl-react icon-react',
  'Vue.js': 'bx bxl-vuejs icon-vue',
  'Vue': 'bx bxl-vuejs icon-vue',
  'Next.js': 'bx bxl-react icon-nextjs',
  'Nuxt.js': 'bx bxl-vuejs icon-nuxtjs',
  'Node.js': 'bx bxl-nodejs icon-nodejs',
  'Nest.js': 'bx bxl-nodejs icon-nestjs',
  'HTML5 / CSS3': 'bx bxl-html5 icon-html',
  'HTML5': 'bx bxl-html5 icon-html',
  'CSS3': 'bx bxl-css3 icon-css',
  'SCSS': 'bx bxl-sass icon-scss',
  'Bootstrap': 'bx bxl-bootstrap icon-bootstrap',
  'Tailwind CSS': 'bx bxl-tailwind-css icon-tailwind',
  'jQuery': 'bx bx-code-curly icon-jquery',
  'JavaScript': 'bx bxl-javascript icon-javascript',
  'TypeScript': 'bx bxl-typescript icon-typescript',
  'Supabase': 'bx bxs-bolt icon-supabase',
  'Spring Boot': 'bx bx-leaf icon-springboot',
  'MongoDB': 'bx bxl-mongodb icon-mongodb',
  'MariaDB': 'bx bx-server icon-mariadb',
  'MySQL': 'bx bx-data icon-mysql',
  'PostgreSQL': 'bx bxl-postgresql icon-postgresql',
  'Flutter / Dart': 'bx bxl-flutter icon-flutter',
  'Python': 'bx bxl-python icon-python',
  'Docker': 'bx bxl-docker icon-docker',
  '기타 (Other)': 'bx bx-code-alt icon-other'
};

@Injectable({
  providedIn: 'root'
})
export class TemplateService {
  private supabase = inject(SupabaseService).client;

  // 내 템플릿 목록 조회 (파일 목록 포함)
  async getTemplates(): Promise<Template[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('templates')
      .select('*, template_files(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('templates 테이블 조회 오류:', error.message);
      return [];
    }
    return data || [];
  }

  // 특정 템플릿의 파일 목록 조회
  async getTemplateFiles(templateId: string): Promise<TemplateFile[]> {
    const { data, error } = await this.supabase
      .from('template_files')
      .select('*')
      .eq('template_id', templateId)
      .order('order_index', { ascending: true });

    if (error) {
      console.warn('template_files 조회 오류:', error.message);
      return [];
    }
    return data || [];
  }

  // 새 템플릿 생성 (메타 + 파일 일괄 등록)
  async createTemplate(
    name: string,
    description: string,
    framework: string,
    files: { name: string; extension: string; content: string }[]
  ): Promise<Template> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다.');

    // 프레임워크에 맞는 아이콘 자동 지정
    const icon = FRAMEWORK_ICONS[framework] || 'bx bx-code-alt';

    // 1) 템플릿 메타 레코드 생성
    const { data: template, error: tplError } = await this.supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name,
        description,
        framework,
        icon
      })
      .select()
      .single();

    if (tplError) throw tplError;

    // 2) 구성 파일들 일괄 삽입
    if (files.length > 0) {
      const fileRows = files.map((f, i) => ({
        template_id: template.id,
        name: f.name,
        extension: f.extension,
        content: f.content,
        order_index: i
      }));

      const { error: filesError } = await this.supabase
        .from('template_files')
        .insert(fileRows);

      if (filesError) throw filesError;
    }

    return template;
  }

  // 템플릿 삭제 (CASCADE로 파일도 함께 삭제됨)
  async deleteTemplate(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // 템플릿 수정 (메타 정보 + 파일 전체 교체)
  async updateTemplate(
    id: string,
    name: string,
    description: string,
    framework: string,
    files: { name: string; extension: string; content: string }[]
  ): Promise<Template> {
    const icon = FRAMEWORK_ICONS[framework] || 'bx bx-code-alt';

    // 1) 메타 정보 업데이트
    const { data: template, error: tplError } = await this.supabase
      .from('templates')
      .update({ name, description, framework, icon })
      .eq('id', id)
      .select()
      .single();

    if (tplError) throw tplError;

    // 2) 기존 파일 전부 삭제
    const { error: delError } = await this.supabase
      .from('template_files')
      .delete()
      .eq('template_id', id);

    if (delError) throw delError;

    // 3) 새 파일 일괄 삽입
    if (files.length > 0) {
      const fileRows = files.map((f, i) => ({
        template_id: id,
        name: f.name,
        extension: f.extension,
        content: f.content,
        order_index: i
      }));

      const { error: filesError } = await this.supabase
        .from('template_files')
        .insert(fileRows);

      if (filesError) throw filesError;
    }

    return template;
  }
}
