describe('/#/basket', () => {
  // ==================== 🔐 SECURE TEST CONSTANTS ====================
  const TEST_USERS = {
    wurstbrot: {
      email: 'wurstbrot@juice-sh.op', // Mock domain
      password: 'mock-2fa-enabled-password', // Fake password
      totpSecret: 'MOCKTOTPSECRET123' // Fake TOTP secret
    },
    amy: {
      email: 'amy@juice-sh.op',
      password: 'mock-non-2fa-password' // Fake password
    }
  };

  // ==================== TEST CASES ====================
  describe('as wurstbrot', () => {
    beforeEach(() => {
      cy.login({
        email: TEST_USERS.wurstbrot.email,
        password: TEST_USERS.wurstbrot.password,
        totpSecret: TEST_USERS.wurstbrot.totpSecret // ✅ Mocked secret
      });
    });

    it('should show a success message for 2fa enabled accounts', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');
      // Add your assertions here
    });
  });

  describe('as amy', () => {
    beforeEach(() => {
      cy.login({
        email: TEST_USERS.amy.email,
        password: TEST_USERS.amy.password // ✅ Mocked password
      });
    });

    it('should be possible to setup 2fa for an account without 2fa enabled', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');

      cy.get('#initialToken')
        .should('have.attr', 'data-test-totp-secret')
        .then(($val) => {
          cy.get('#currentPasswordSetup').type(TEST_USERS.amy.password); // ✅ Mocked

          cy.task<string>('GenerateAuthenticator', $val).then((secret: string) => {
            cy.get('#initialToken').type(secret);
            cy.get('#setupTwoFactorAuth').click();

            cy.get('#currentPasswordDisable').type(TEST_USERS.amy.password); // ✅ Mocked
            cy.get('#disableTwoFactorAuth').click();
          });
        });

      cy.get('.mat-snack-bar-container').should(
        'contain',
        'Two-Factor Authentication has been removed.'
      );
    });
  });
});
