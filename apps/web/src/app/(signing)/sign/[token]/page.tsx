import { notFound, redirect } from 'next/navigation';

import { match } from 'ts-pattern';

import { DEFAULT_DOCUMENT_DATE_FORMAT } from '@documenso/lib/constants/date-formats';
import { PDF_VIEWER_PAGE_SELECTOR } from '@documenso/lib/constants/pdf-viewer';
import { DEFAULT_DOCUMENT_TIME_ZONE } from '@documenso/lib/constants/time-zones';
import { getServerComponentSession } from '@documenso/lib/next-auth/get-server-component-session';
import { getDocumentAndSenderByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { getDocumentMetaByDocumentId } from '@documenso/lib/server-only/document/get-document-meta-by-document-id';
import { viewedDocument } from '@documenso/lib/server-only/document/viewed-document';
import { getFieldsForToken } from '@documenso/lib/server-only/field/get-fields-for-token';
import { getRecipientByToken } from '@documenso/lib/server-only/recipient/get-recipient-by-token';
import { getRecipientSignatures } from '@documenso/lib/server-only/recipient/get-recipient-signatures';
import { DocumentStatus, FieldType, SigningStatus } from '@documenso/prisma/client';
import { Card, CardContent } from '@documenso/ui/primitives/card';
import { ElementVisible } from '@documenso/ui/primitives/element-visible';
import { LazyPDFViewer } from '@documenso/ui/primitives/lazy-pdf-viewer';

import { truncateTitle } from '~/helpers/truncate-title';

import { DateField } from './date-field';
import { EmailField } from './email-field';
import { SigningForm } from './form';
import { NameField } from './name-field';
import { NoLongerAvailable } from './no-longer-available';
import { SigningProvider } from './provider';
import { SignatureField } from './signature-field';

export type SigningPageProps = {
  params: {
    token?: string;
  };
};

export default async function SigningPage({ params: { token } }: SigningPageProps) {
  if (!token) {
    return notFound();
  }

  const [document, fields, recipient] = await Promise.all([
    getDocumentAndSenderByToken({
      token,
    }).catch(() => null),
    getFieldsForToken({ token }),
    getRecipientByToken({ token }).catch(() => null),
    viewedDocument({ token }).catch(() => null),
  ]);

  const documentMeta = await getDocumentMetaByDocumentId({ id: document!.id }).catch(() => null);

  if (!document || !document.documentData || !recipient) {
    return notFound();
  }

  const truncatedTitle = truncateTitle(document.title);

  const { documentData } = document;

  const { user } = await getServerComponentSession();

  if (
    document.status === DocumentStatus.COMPLETED ||
    recipient.signingStatus === SigningStatus.SIGNED
  ) {
    redirect(`/sign/${token}/complete`);
  }

  const [recipientSignature] = await getRecipientSignatures({ recipientId: recipient.id });

  if (document.deletedAt) {
    return (
      <NoLongerAvailable
        document={document}
        recipientName={recipient.name}
        recipientSignature={recipientSignature}
      />
    );
  }

  return (
    <SigningProvider
      email={recipient.email}
      fullName={user?.email === recipient.email ? user.name : recipient.name}
      signature={user?.email === recipient.email ? user.signature : undefined}
    >
      <div className="mx-auto w-full max-w-screen-xl">
        <h1 className="mt-4 truncate text-2xl font-semibold md:text-3xl" title={document.title}>
          {truncatedTitle}
        </h1>

        <div className="mt-2.5 flex items-center gap-x-6">
          <p className="text-muted-foreground">
            {document.User.name} ({document.User.email}) has invited you to sign this document.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-12 gap-y-8 lg:gap-x-8 lg:gap-y-0">
          <Card
            className="col-span-12 rounded-xl before:rounded-xl lg:col-span-7 xl:col-span-8"
            gradient
          >
            <CardContent className="p-2">
              <LazyPDFViewer key={documentData.id} documentData={documentData} />
            </CardContent>
          </Card>

          <div className="col-span-12 lg:col-span-5 xl:col-span-4">
            <SigningForm document={document} recipient={recipient} fields={fields} />
          </div>
        </div>

        <ElementVisible target={PDF_VIEWER_PAGE_SELECTOR}>
          {fields.map((field) =>
            match(field.type)
              .with(FieldType.SIGNATURE, () => (
                <SignatureField key={field.id} field={field} recipient={recipient} />
              ))
              .with(FieldType.NAME, () => (
                <NameField key={field.id} field={field} recipient={recipient} />
              ))
              .with(FieldType.DATE, () => (
                <DateField
                  key={field.id}
                  field={field}
                  recipient={recipient}
                  dateFormat={documentMeta?.dateFormat ?? DEFAULT_DOCUMENT_DATE_FORMAT}
                  timezone={documentMeta?.timezone ?? DEFAULT_DOCUMENT_TIME_ZONE}
                />
              ))
              .with(FieldType.EMAIL, () => (
                <EmailField key={field.id} field={field} recipient={recipient} />
              ))
              .otherwise(() => null),
          )}
        </ElementVisible>
      </div>
    </SigningProvider>
  );
}
