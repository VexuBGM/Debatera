import { describe, expect, it } from 'vitest';
import { GET, POST } from '@/app/api/institutions/route';
import { createInstitution, createInstitutionMember } from '@tests/factories/institution.factory';
import { createUser } from '@tests/factories/user.factory';
import { createJsonRequest, responseJson } from '@tests/helpers/api-request';
import { expectJsonError } from '@tests/helpers/assert-api-response';
import { mockAuthenticatedUser, mockUnauthenticatedUser } from '@tests/setup/clerk-mock';
import { testPrisma } from '@tests/setup/prisma-test-client';

describe('institution API routes', () => {
  it('creates an institution and makes the creator an admin', async () => {
    const user = await createUser({ id: 'institution_api_creator' });
    mockAuthenticatedUser({ id: user.id, email: 'creator@example.com' });

    const response = await POST(
      createJsonRequest('http://localhost/api/institutions', {
        method: 'POST',
        body: { name: 'API Institution' },
      })
    );

    expect(response.status).toBe(201);
    const body = await responseJson<{ id: string; name: string }>(response);
    expect(body.name).toBe('API Institution');
    await expect(
      testPrisma.institutionMember.findUnique({
        where: { institutionId_userId: { institutionId: body.id, userId: user.id } },
      })
    ).resolves.toEqual(expect.objectContaining({ role: 'ADMIN' }));
  });

  it('lists only public institutions and memberships for the current viewer', async () => {
    const member = await createUser({ id: 'institution_api_member' });
    const publicInstitution = await createInstitution({ name: 'Public API Institution', isPublic: true });
    const privateInstitution = await createInstitution({ name: 'Private API Institution', isPublic: false });
    await createInstitutionMember({
      institutionId: privateInstitution.id,
      userId: member.id,
      role: 'MEMBER',
    });

    mockUnauthenticatedUser();
    const anonymousResponse = await GET(createJsonRequest('http://localhost/api/institutions'));
    const anonymousBody = await responseJson<{ data: Array<{ id: string }> }>(anonymousResponse);
    expect(anonymousBody.data.map((institution) => institution.id)).toEqual([publicInstitution.id]);

    mockAuthenticatedUser({ id: member.id, email: 'member@example.com' });
    const memberResponse = await GET(createJsonRequest('http://localhost/api/institutions'));
    const memberBody = await responseJson<{ data: Array<{ id: string }> }>(memberResponse);
    expect(memberBody.data.map((institution) => institution.id)).toEqual(
      expect.arrayContaining([publicInstitution.id, privateInstitution.id])
    );
  });

  it('rejects invalid creation payloads before writing', async () => {
    const user = await createUser({ id: 'institution_api_invalid' });
    mockAuthenticatedUser({ id: user.id, email: 'creator@example.com' });

    const response = await POST(
      createJsonRequest('http://localhost/api/institutions', {
        method: 'POST',
        body: { name: '' },
      })
    );

    await expectJsonError(response, 400);
    await expect(testPrisma.institution.count()).resolves.toBe(0);
  });
});
