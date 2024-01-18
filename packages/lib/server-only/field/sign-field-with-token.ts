'use server';

import { DateTime } from 'luxon';

import { prisma } from '@documenso/prisma';
import { DocumentStatus, FieldType, SigningStatus } from '@documenso/prisma/client';

import { DEFAULT_DOCUMENT_DATE_FORMAT } from '../../constants/date-formats';
import { DEFAULT_DOCUMENT_TIME_ZONE } from '../../constants/time-zones';

export type SignFieldWithTokenOptions = {
  token: string;
  fieldId: number;
  value: string;
  isBase64?: boolean;
};

export const signFieldWithToken = async ({
  token,
  fieldId,
  value,
  isBase64,
}: SignFieldWithTokenOptions) => {
  const field = await prisma.field.findFirstOrThrow({
    where: {
      id: fieldId,
      Recipient: {
        token,
      },
    },
    include: {
      Document: true,
      Recipient: true,
    },
  });

  const { Document: document, Recipient: recipient } = field;

  if (!document) {
    throw new Error(`Document not found for field ${field.id}`);
  }

  if (document.status === DocumentStatus.COMPLETED) {
    throw new Error(`Document ${document.id} has already been completed`);
  }

  if (document.deletedAt) {
    throw new Error(`Document ${document.id} has been deleted`);
  }

  if (recipient?.signingStatus === SigningStatus.SIGNED) {
    throw new Error(`Recipient ${recipient.id} has already signed`);
  }

  if (field.inserted) {
    throw new Error(`Field ${fieldId} has already been inserted`);
  }

  // Unreachable code based on the above query but we need to satisfy TypeScript
  if (field.recipientId === null) {
    throw new Error(`Field ${fieldId} has no recipientId`);
  }

  const documentMeta = await prisma.documentMeta.findFirst({
    where: {
      documentId: document.id,
    },
  });

  const isSignatureField =
    field.type === FieldType.SIGNATURE || field.type === FieldType.FREE_SIGNATURE;

  let customText = !isSignatureField ? value : undefined;

  const signatureImageAsBase64 = isSignatureField && isBase64 ? value : undefined;
  const typedSignature = isSignatureField && !isBase64 ? value : undefined;

  if (field.type === FieldType.DATE) {
    customText = DateTime.now()
      .setZone(documentMeta?.timezone ?? DEFAULT_DOCUMENT_TIME_ZONE)
      .toFormat(documentMeta?.dateFormat ?? DEFAULT_DOCUMENT_DATE_FORMAT);
  }

  if (isSignatureField && !signatureImageAsBase64 && !typedSignature) {
    throw new Error('Signature field must have a signature');
  }

  return await prisma.$transaction(async (tx) => {
    const updatedField = await tx.field.update({
      where: {
        id: field.id,
      },
      data: {
        customText,
        inserted: true,
      },
    });

    if (isSignatureField) {
      if (!field.recipientId) {
        throw new Error('Field has no recipientId');
      }

      const signature = await tx.signature.upsert({
        where: {
          fieldId: field.id,
        },
        create: {
          fieldId: field.id,
          recipientId: field.recipientId,
          signatureImageAsBase64: signatureImageAsBase64,
          typedSignature: typedSignature,
        },
        update: {
          signatureImageAsBase64: signatureImageAsBase64,
          typedSignature: typedSignature,
        },
      });

      // Dirty but I don't want to deal with type information
      Object.assign(updatedField, {
        Signature: signature,
      });
    }

    return updatedField;
  });
};
