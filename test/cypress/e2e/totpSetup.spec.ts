describe('/#/basket', () => {
  // ==================== 🔐 SECURE TEST CONSTANTS ====================
  const TEST_USERS = {
    twoFactorUser: {
      email: 'test-2fa-user@juice-sh.op',
      password: 'mock-2fa-password-123!',
      totpSecret: 'MOCK2FASECRET123ABC!@#'
    },
    standardUser: {
      email: 'test-standard-user@juice-sh.op',
      password: 'mock-standard-password-456!'
    }
  };

  // ==================== TEST UTILITIES ====================
  const complete2faSetup = (password: string, secretAttr: string) => {
    cy.get('#currentPasswordSetup').type(password);
    cy.task<string>('GenerateAuthenticator', secretAttr).then((totpCode) => {
      cy.get('#initialToken').type(totpCode);
      cy.get('#setupTwoFactorAuth').click();
      cy.get('.mat-snack-bar-container')
        .should('contain', 'Two-Factor Authentication is now enabled');
    });
  };

  const disable2fa = (password: string) => {
    cy.get('#currentPasswordDisable').type(password);
    cy.get('#disableTwoFactorAuth').click();
    cy.get('.mat-snack-bar-container')
      .should('contain', 'Two-Factor Authentication has been removed');
  };

  // ==================== TEST CASES ====================
  describe('as 2FA-enabled user', () => {
    beforeEach(() => {
      cy.login({
        email: TEST_USERS.twoFactorUser.email,
        password: TEST_USERS.twoFactorUser.password,
        totpSecret: TEST_USERS.twoFactorUser.totpSecret
      });
    });

    it('should display 2FA management interface', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');
      
      // Verify UI elements
      cy.get('.mat-card-title')
        .should('contain', 'Two-Factor Authentication');
      cy.get('#disableTwoFactorAuth')
        .should('be.visible')
        .and('not.be.disabled');
      cy.get('#currentPasswordDisable')
        .should('be.visible');
    });
  });

  describe('as standard user', () => {
    beforeEach(() => {
      cy.login({
        email: TEST_USERS.standardUser.email,
        password: TEST_USERS.standardUser.password
      });
    });

    it('should complete full 2FA setup and disable flow', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');

      cy.get('#initialToken')
        .should('have.attr', 'data-test-totp-secret')
        .then((secretAttr) => {
          // Verify initial disabled state
          cy.get('#setupTwoFactorAuth')
            .should('be.disabled');

          // Complete 2FA setup
          complete2faSetup(TEST_USERS.standardUser.password, secretAttr);

          // Complete 2FA disable
          disable2fa(TEST_USERS.standardUser.password);
        });
    });

    it('should prevent 2FA setup with wrong password', () => {
      cy.visit('/#/privacy-security/two-factor-authentication');

      cy.get('#initialToken')
        .should('exist')
        .then((secretAttr) => {
          // Attempt setup with incorrect password
          cy.get('#currentPasswordSetup')
            .type('wrong-password-123');
          cy.task<string>('GenerateAuthenticator', secretAttr)
            .then((totpCode) => {
              cy.get('#initialToken').type(totpCode);
              cy.get('#setupTwoFactorAuth').click();
              cy.get('.error-message')
                .should('contain', 'Invalid password');
            });
        });
    });
  });
});
