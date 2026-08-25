import React from 'react';
import NavBar from '../components/NavBar';
import GlassCard from '../components/GlassCard';

const Policy: React.FC = () => (
  <div className="bg-gray-50 transition-colors duration-300 dark:bg-la-dark">
    <NavBar />
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">개인정보처리방침</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          로아끼욧은 이용자의 정보를 안전하게 다루기 위해 다음과 같이 개인정보 처리 기준을 안내합니다.
        </p>
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">시행일: 2026년 8월 25일</p>
      </header>

      <GlassCard className="space-y-8 p-5 text-sm leading-7 text-gray-700 sm:p-8 dark:text-gray-300">
        <section aria-labelledby="policy-purpose">
          <h2 id="policy-purpose" className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            1. 처리하는 정보와 이용 목적
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>캐릭터 검색과 서비스 기능 제공을 위해 이용자가 입력한 캐릭터 닉네임을 처리합니다.</li>
            <li>
              서비스 품질 개선과 오류 분석을 위해 방문 페이지, 접속 환경, 대략적인 지역 등의 이용 정보가
              Vercel Analytics를 통해 처리될 수 있습니다.
            </li>
            <li>회원가입, 실명, 연락처 또는 결제 정보를 직접 수집하지 않습니다.</li>
          </ul>
        </section>

        <section aria-labelledby="policy-storage">
          <h2 id="policy-storage" className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            2. 브라우저 저장 정보
          </h2>
          <p>
            최근 검색한 캐릭터 닉네임, 테마 설정, 시뮬레이션 및 숙제 관리 상태 등은 편의 기능 제공을 위해
            이용자의 브라우저 저장소에 저장됩니다. 해당 정보는 브라우저의 사이트 데이터 삭제 기능으로
            언제든지 삭제할 수 있습니다.
          </p>
        </section>

        <section aria-labelledby="policy-retention">
          <h2 id="policy-retention" className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            3. 보유 및 파기
          </h2>
          <p>
            캐릭터 조회 정보는 기능 제공 과정에서만 사용하며 별도의 회원 데이터베이스에 저장하지 않습니다.
            브라우저 저장 정보는 이용자가 삭제할 때까지 보관되며, 분석 정보는 Vercel의 정책에 따라 보관 및
            삭제됩니다.
          </p>
        </section>

        <section aria-labelledby="policy-third-party">
          <h2 id="policy-third-party" className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            4. 외부 서비스 이용
          </h2>
          <p>
            로아끼욧은 캐릭터 및 게임 정보 제공을 위해 LOST ARK Open API를 이용하고, 서비스 배포와 이용 현황
            분석을 위해 Vercel을 이용합니다. 각 외부 서비스에서 처리되는 정보에는 해당 서비스의 개인정보
            처리방침이 적용됩니다.
          </p>
        </section>

        <section aria-labelledby="policy-rights">
          <h2 id="policy-rights" className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            5. 이용자의 권리
          </h2>
          <p>
            이용자는 브라우저에 저장된 정보를 직접 확인하거나 삭제할 수 있으며, 브라우저 설정 또는 콘텐츠
            차단 기능을 통해 분석 정보 처리를 제한할 수 있습니다.
          </p>
        </section>

        <section aria-labelledby="policy-changes">
          <h2 id="policy-changes" className="mb-2 text-base font-bold text-gray-900 dark:text-white">
            6. 방침 변경
          </h2>
          <p>
            이 방침의 내용이 변경되는 경우 시행 전에 서비스 내 공지 또는 이 페이지를 통해 안내합니다.
          </p>
        </section>
      </GlassCard>
    </main>
  </div>
);

export default Policy;
