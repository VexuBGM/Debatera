type MockClerkUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
};

let mockUser: MockClerkUser | null = null;

export function mockAuthenticatedUser(user: MockClerkUser) {
  mockUser = user;
}

export function mockUnauthenticatedUser() {
  mockUser = null;
}

export function getMockAuthResult() {
  return { userId: mockUser?.id ?? null };
}

export function getMockClerkUser() {
  const user = mockUser ?? {
    id: 'user_test',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    imageUrl: '',
  };

  return {
    id: user.id,
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    imageUrl: user.imageUrl ?? '',
    primaryEmailAddressId: 'primary',
    emailAddresses: [
      {
        id: 'primary',
        emailAddress: user.email,
      },
    ],
  };
}
