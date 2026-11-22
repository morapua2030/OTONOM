import type { ReactNode } from 'react';
import type { AdminViewServerProps } from 'payload';
import { DefaultTemplate } from '@payloadcms/next/templates';
import { Gutter } from '@payloadcms/ui';

/** A custom admin view in the OTONOM look: Payload's template (menu, top bar), the title and the page line (M4). */
export function AdminPage(props: AdminViewServerProps & { title: string; line: string; children: ReactNode; testId?: string }) {
  const { initPageResult, params, searchParams } = props;
  return (
    <DefaultTemplate
      i18n={initPageResult.req.i18n}
      locale={initPageResult.locale}
      params={params}
      payload={initPageResult.req.payload}
      permissions={initPageResult.permissions}
      req={initPageResult.req}
      searchParams={searchParams}
      user={initPageResult.req.user ?? undefined}
      visibleEntities={initPageResult.visibleEntities}
    >
      <Gutter>
        <div className="otn-page" data-testid={props.testId}>
          <header className="otn-page__head">
            <h1 className="otn-title">{props.title}</h1>
            <p className="otn-line">{props.line}</p>
          </header>
          {props.children}
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}
