export interface TemplateFilePreset {
  name: string;
  extension: string;
  content: string;
}

export interface TemplatePreset {
  id: string;
  category: 'ui' | 'api' | 'css';
  categoryLabel: string;
  name: string;
  description: string;
  icon: string;
  frameworks: {
    framework: 'angular' | 'react' | 'vue' | 'html';
    label: string;
    files: TemplateFilePreset[];
  }[];
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'c-dropdown',
    category: 'ui',
    categoryLabel: 'UI 컴포넌트',
    name: 'CDropdown (드롭다운)',
    description: '뉴모피즘 스타일의 옵션 선택 및 멀티 셀렉트 지원 드롭다운 컴포넌트 템플릿',
    icon: 'bx bx-chevron-down-circle',
    frameworks: [
      {
        framework: 'angular',
        label: 'Angular',
        files: [
          {
            name: 'c-dropdown.component.html',
            extension: 'html',
            content: `<div class="dropdownContainer">
  <button class="dropdownTrigger" (click)="toggle()">
    <span>{{ selectedValue || '옵션 선택' }}</span>
    <i class="bx bx-chevron-down"></i>
  </button>
  <div *ngIf="isOpen" class="dropdownMenu">
    <div *ngFor="let opt of options" class="dropdownItem" (click)="select(opt)">
      {{ opt.label }}
    </div>
  </div>
</div>`
          },
          {
            name: 'c-dropdown.component.scss',
            extension: 'scss',
            content: `.dropdownContainer {
  position: relative;
  display: inline-block;

  .dropdownTrigger {
    background: #e0e5ec;
    border: none;
    border-radius: 14px;
    padding: 10px 16px;
    box-shadow: 4px 4px 10px #a3b1c6, -4px -4px 10px #ffffff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dropdownMenu {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    width: 180px;
    background: #e0e5ec;
    border-radius: 16px;
    box-shadow: 8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff;
    padding: 8px;
    z-index: 100;

    .dropdownItem {
      padding: 8px 12px;
      border-radius: 10px;
      cursor: pointer;
      &:hover {
        background: rgba(74, 134, 255, 0.1);
        color: #4a86ff;
      }
    }
  }
}`
          },
          {
            name: 'c-dropdown.component.ts',
            extension: 'ts',
            content: `import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-c-dropdown',
  templateUrl: './c-dropdown.component.html',
  styleUrls: ['./c-dropdown.component.scss']
})
export class CDropdownComponent {
  @Input() options: { label: string; value: any }[] = [];
  @Input() selectedValue: any;
  @Output() selectedValueChange = new EventEmitter<any>();

  isOpen = false;

  toggle() {
    this.isOpen = !this.isOpen;
  }

  select(opt: any) {
    this.selectedValue = opt.value;
    this.selectedValueChange.emit(opt.value);
    this.isOpen = false;
  }
}`
          }
        ]
      },
      {
        framework: 'react',
        label: 'React (JSX)',
        files: [
          {
            name: 'CDropdown.jsx',
            extension: 'js',
            content: `import React, { useState } from 'react';
import './CDropdown.css';

export const CDropdown = ({ options = [], value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dropdownContainer">
      <button className="dropdownTrigger" onClick={() => setIsOpen(!isOpen)}>
        <span>{value || '옵션 선택'}</span>
        <i className="bx bx-chevron-down"></i>
      </button>
      {isOpen && (
        <div className="dropdownMenu">
          {options.map((opt, idx) => (
            <div 
              key={idx} 
              className="dropdownItem"
              onClick={() => {
                onChange && onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};`
          },
          {
            name: 'CDropdown.css',
            extension: 'css',
            content: `.dropdownContainer {
  position: relative;
  display: inline-block;
}

.dropdownTrigger {
  background: #e0e5ec;
  border: none;
  border-radius: 14px;
  padding: 10px 16px;
  box-shadow: 4px 4px 10px #a3b1c6, -4px -4px 10px #ffffff;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.dropdownMenu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  width: 180px;
  background: #e0e5ec;
  border-radius: 16px;
  box-shadow: 8px 8px 16px #a3b1c6, -8px -8px 16px #ffffff;
  padding: 8px;
  z-index: 100;
}`
          }
        ]
      }
    ]
  },
  {
    id: 'd-alert',
    category: 'ui',
    categoryLabel: 'UI 컴포넌트',
    name: 'DAlert (알림 모달)',
    description: '확인/취소 및 경고 메시지를 띄우는 뉴모피즘 알림 창 템플릿',
    icon: 'bx bx-bell',
    frameworks: [
      {
        framework: 'angular',
        label: 'Angular',
        files: [
          {
            name: 'd-alert.component.html',
            extension: 'html',
            content: `<div *ngIf="isOpen" class="alertBackdrop">
  <div class="alertCard">
    <h3 class="alertTitle">{{ title }}</h3>
    <p class="alertMessage">{{ message }}</p>
    <div class="alertActions">
      <button (click)="cancel()">취소</button>
      <button class="confirm" (click)="confirm()">확인</button>
    </div>
  </div>
</div>`
          },
          {
            name: 'd-alert.component.scss',
            extension: 'scss',
            content: `.alertBackdrop {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;

  .alertCard {
    background: #e0e5ec;
    padding: 24px;
    border-radius: 20px;
    box-shadow: 10px 10px 20px #a3b1c6, -10px -10px 20px #ffffff;
    width: 320px;
  }
}`
          }
        ]
      }
    ]
  },
  {
    id: 'rest-api-client',
    category: 'api',
    categoryLabel: 'REST API',
    name: 'REST API Client Wrapper',
    description: 'Supabase 및 REST API CRUD 통신 래퍼 데이터 처리 템플릿',
    icon: 'bx bx-cloud',
    frameworks: [
      {
        framework: 'angular',
        label: 'Angular TypeScript',
        files: [
          {
            name: 'api-client.service.ts',
            extension: 'ts',
            content: `import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiClientService {
  private baseUrl = 'https://api.example.com';

  async get<T>(endpoint: string): Promise<T> {
    const res = await fetch(\`\${this.baseUrl}/\${endpoint}\`);
    if (!res.ok) throw new Error('API Request Failed');
    return res.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const res = await fetch(\`\${this.baseUrl}/\${endpoint}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('API Request Failed');
    return res.json();
  }
}`
          }
        ]
      }
    ]
  }
];
