describe('/#/basket', () => {
  // ==================== 🔐 SECURE TEST CONSTANTS ====================
  const TEST_USERS = {
    wurstbrot: {
      email: 'wurstbrot@juice-sh.op',
      password: 'mock-2fa-enabled-password-123',
      totpSecret: 'MOCKTOTPSECRET123ABC'
    },
    amy: {
      email: 'test-amy@juice-sh.op',
      password: 'mock-password-456!'
    }
  };

  // ==================== TEST CASES ====================
  describe('as wurstbrot (2FA enabled user)', () => {
    beforeEach(() => {
      cy.login({
        email: TEST_USERS.wurstbrot.email,
        password: TEST_USERS.wurstbrot.password,
        totpSecret: TEST_USERS.wurstbrot.totpSecret
      });
    });

    it('should show 2FA status for authenticated user', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');
      cy.get('.mat-card-title')
        .should('contain', 'Two-Factor Authentication');
      cy.get('#disableTwoFactorAuth')
        .should('be.visible');
    });
  });

  describe('as amy (non-2FA user)', () => {
    beforeEach(() => {
      cy.login({
        email: TEST_USERS.amy.email,
        password: TEST_USERS.amy.password
      });
    });

    it('should complete 2FA setup flow', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');

      cy.get('#initialToken')
        .should('have.attr', 'data-test-totp-secret')
        .then(($secretAttr) => {
          // Verify initial state
          cy.get('#setupTwoFactorAuth')
            .should('be.disabled');

          // Enter current password
          cy.get('#currentPasswordSetup')
            .type(TEST_USERS.amy.password);

          // Generate and enter TOTP code
          cy.task<string>('GenerateAuthenticator', $secretAttr)
            .then((totpCode) => {
              cy.get('#initialToken')
                .type(totpCode);
              
              // Complete setup
              cy.get('#setupTwoFactorAuth')
                .should('be.enabled')
                .click();

              // Verify success
              cy.get('.mat-snack-bar-container')
                .should('contain', 'Two-Factor Authentication is now enabled');

              // Test disable flow
              cy.get('#currentPasswordDisable')
                .type(TEST_USERS.amy.password);
              cy.get('#disableTwoFactorAuth')
                .click();

              // Final verification
              cy.get('.mat-snack-bar-container')
                .should('contain', 'Two-Factor Authentication has been removed');
            });
        });
    });
  });
});
