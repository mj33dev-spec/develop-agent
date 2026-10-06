import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CModalComponent } from '../c-modal/c-modal.component';
import { CButtonComponent } from '../c-button/c-button.component';

/**
 * 이용 가이드 단계 인터페이스
 */
export interface GuideStep {
  title: string;
  icon: string;
  badge: string;
  description: string;
  details: string[];
}

@Component({
  selector: 'app-guide-modal',
  standalone: true,
  imports: [CommonModule, CModalComponent, CButtonComponent],
  templateUrl: './guide-modal.component.html',
  styleUrls: ['./guide-modal.component.scss']
})
export class GuideModalComponent {
  /** 모달 열림 여부 */
  @Input() isOpen: boolean = false;
  /** 모달 닫기 이벤트 발송 */
  @Output() onClose = new EventEmitter<void>();

  /** 현재 선택된 스텝 인덱스 */
  currentStepIndex: number = 0;
  /** 다시 보지 않기 여부 */
  dontShowAgain: boolean = true;

  /** 온보딩 가이드 단계 데이터 목록 */
  steps: GuideStep[] = [
    {
      title: '스마트 AI 멀티모델 대화',
      icon: 'bx bx-bot',
      badge: 'Step 1 / 4',
      description: '프로젝트에 최적화된 고성능 AI 모델을 자유롭게 선택하세요.',
      details: [
        'Gemini 3.6 Flash, Groq Qwen, Llama 3.3, DeepSeek R1 지원',
        '채팅 입력창 하단 드롭다운으로 실시간 모델 변경 가능',
        '코드 및 대화 이력 자동 저장 및 복원'
      ]
    },
    {
      title: '통합 코드 뷰어 & 소스 분석',
      icon: 'bx bx-code-alt',
      badge: 'Step 2 / 4',
      description: '소스 코드를 생성/편집하고 즉시 AI에게 질의할 수 있습니다.',
      details: [
        '사이드바 파일 트리에서 파일 및 폴더 생성/관리',
        '코드 뷰어에서 텍스트 수정 및 하이라이팅 지원',
        '코드 뷰어 하단 입력창을 통해 파일 관련 질의 생성'
      ]
    },
    {
      title: '스마트 첨부 & 템플릿 프리셋',
      icon: 'bx bx-paperclip',
      badge: 'Step 3 / 4',
      description: '다양한 리소스를 스마트 칩 형태로 대화에 첨부하세요.',
      details: [
        '입력창의 + 버튼을 클릭하여 파일/이미지/템플릿 첨부',
        '프론트엔드/백엔드 스타터 프로젝트 템플릿 생성 지원',
        '첨부 칩으로 직관적인 컨텍스트 전달'
      ]
    },
    {
      title: '라이트 & 다크 모드',
      icon: 'bx bx-palette',
      badge: 'Step 4 / 4',
      description: '사용자 환경에 알맞은 시각적 테마를 설정하세요.',
      details: [
        '환경 설정에서 라이트 모드 및 다크 모드 제공',
        '눈의 피로를 줄여주는 다크 모드 원클릭 전환',
        '설정 변경 시 계정 DB 및 브라우저에 자동 반영'
      ]
    }
  ];

  /** 현재 단계 데이터 반환 */
  get currentStep(): GuideStep {
    return this.steps[this.currentStepIndex];
  }

  /** 다음 단계 이동 */
  nextStep() {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
    } else {
      this.finish();
    }
  }

  /** 이전 단계 이동 */
  prevStep() {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
    }
  }

  /** 특정 단계 설정 */
  setStep(index: number) {
    this.currentStepIndex = index;
  }

  /** 다시 보지 않기 옵션 토글 */
  toggleDontShowAgain() {
    this.dontShowAgain = !this.dontShowAgain;
  }

  /** 가이드 종료 처리 */
  finish() {
    if (this.dontShowAgain) {
      localStorage.setItem('has_seen_onboarding_guide', 'true');
    }
    this.onClose.emit();
  }
}
