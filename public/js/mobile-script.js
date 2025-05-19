// JavaScript for mobile functionality
document.addEventListener('DOMContentLoaded', function() {
    // Create mobile menu elements
    function createMobileMenu() {
        // Create mobile menu toggle button
        const menuToggle = document.createElement('button');
        menuToggle.className = 'header__menu-toggle';
        menuToggle.innerHTML = '<img src="./assets/icons/menu.png" alt="Menu" class="menu">';
        
        // Add toggle button to header
        const headerRight = document.querySelector('.header__menu-right');
        if (headerRight) {
            headerRight.append(menuToggle);
        }
        
        // Create mobile menu structure
        const mobileMenu = document.createElement('div');
        mobileMenu.className = 'mobile-menu';
        mobileMenu.innerHTML = `
            <button class="mobile-menu__close">&times;</button>
            <ul class="mobile-menu__list">
                <li class="mobile-menu__item"><a href="index.html">Головна</a></li>
                <li class="mobile-menu__item"><a href="films.html">Фільми</a></li>
                <li class="mobile-menu__item"><a href="schedule.html">Розклад</a></li>
                <li class="mobile-menu__item"><a href="about.html">Про нас</a></li>
                <li class="mobile-menu__item"><a href="contacts.html">Контакти</a></li>
            </ul>
        `;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        
        // Add mobile menu and overlay to body
        document.body.appendChild(mobileMenu);
        document.body.appendChild(overlay);
        
        // Toggle menu functionality
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent scrolling when menu is open
        });
        
        // Close menu functionality
        const closeMenuButton = document.querySelector('.mobile-menu__close');
        closeMenuButton.addEventListener('click', closeMenu);
        
        overlay.addEventListener('click', closeMenu);
        
        function closeMenu() {
            mobileMenu.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = ''; // Re-enable scrolling
        }
        
        // Close menu when link is clicked
        const menuLinks = document.querySelectorAll('.mobile-menu__item a');
        menuLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }
    
    // Make phone numbers clickable
    function makePhoneNumbersClickable() {
        const phoneElements = document.querySelectorAll('.phone-number');
        phoneElements.forEach(el => {
            const phoneNumber = el.textContent.trim().replace(/\s+/g, '');
            const phoneLink = document.createElement('a');
            phoneLink.href = `tel:${phoneNumber}`;
            phoneLink.textContent = el.textContent;
            el.parentNode.replaceChild(phoneLink, el);
        });
    }
    
    // Adjust seat size based on screen width
    function adjustSeatSize() {
        const seatElements = document.querySelectorAll('.seat');
        const screenWidth = window.innerWidth;
        
        // Calculate optimal seat size based on screen width
        // This ensures seats fit well on different device sizes
        if (screenWidth < 360) {
            // Very small screens
            seatElements.forEach(seat => {
                seat.style.width = '28px';
                seat.style.height = '28px';
                seat.style.fontSize = '12px';
            });
        } else if (screenWidth < 576) {
            // Extra small screens
            seatElements.forEach(seat => {
                seat.style.width = '32px';
                seat.style.height = '32px';
                seat.style.fontSize = '14px';
            });
        }
        
        // Adjust screen element width based on container width
        const screenElement = document.querySelector('.screen-shape');
        if (screenElement) {
            const containerWidth = document.querySelector('.booking-center-column').offsetWidth;
            screenElement.style.width = Math.min(containerWidth * 0.9, 400) + 'px';
        }
    }
    
    // Simplify forms for mobile
    function simplifyForms() {
        const forms = document.querySelectorAll('form');
        
        forms.forEach(form => {
            // Add autocomplete attributes
            form.setAttribute('autocomplete', 'on');
            
            // Add proper input types for mobile
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                // Set telephone input type
                if (input.name.includes('phone') || input.id.includes('phone')) {
                    input.type = 'tel';
                    input.setAttribute('autocomplete', 'tel');
                }
                
                // Set email input type
                if (input.name.includes('email') || input.id.includes('email')) {
                    input.type = 'email';
                    input.setAttribute('autocomplete', 'email');
                }
                
                // Ensure text inputs are large enough on mobile
                if (input.type === 'text' || input.type === 'tel' || input.type === 'email') {
                    input.style.fontSize = '16px'; // Prevents iOS zoom on focus
                    input.style.padding = '12px';
                }
            });
        });
    }
    
    // Initialize mobile functionality
    function initMobile() {
        createMobileMenu();
        makePhoneNumbersClickable();
        adjustSeatSize();
        simplifyForms();
        // Initial call
        toggleScheduleView();
      
      // Call on resize
        window.addEventListener('resize', toggleScheduleView);

        
        // Re-adjust on resize
        window.addEventListener('resize', function() {
            adjustSeatSize();
        });
    }
    
    document.addEventListener("headerLoaded", function() {
    initMobile(); // Запускаємо мобільну логіку після завантаження header
    });
    
    const mobileMenuButton = document.getElementById('mobile-menu-button');
      const mobileMenu = document.getElementById('mobile-menu');
      const mobileMenuClose = document.getElementById('mobile-menu-close');
      const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
      
      mobileMenuButton.addEventListener('click', function() {
        mobileMenu.classList.add('active');
        mobileMenuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      });
      
      mobileMenuClose.addEventListener('click', closeMenu);
      mobileMenuOverlay.addEventListener('click', closeMenu);
      
      function closeMenu() {
        mobileMenu.classList.remove('active');
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = '';
      }
      
      // Date selection for mobile view
      const dateSelectors = document.querySelectorAll('.date-selector-item');
      const movieCards = document.querySelectorAll('.movie-card');
      
      dateSelectors.forEach(selector => {
        selector.addEventListener('click', function() {
          // Remove active class from all selectors
          dateSelectors.forEach(sel => sel.classList.remove('active'));
          
          // Add active class to clicked selector
          this.classList.add('active');
          
          const selectedDate = this.getAttribute('data-date');
          
          // Show/hide movie cards based on selected date
          movieCards.forEach(card => {
            const availableDates = card.getAttribute('data-dates').split(',');
            if (availableDates.includes(selectedDate)) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });
        });
      });
      
      // Trigger click on first date to initialize the view
      dateSelectors[0].click();
      
      // Display appropriate view based on screen size
      function toggleScheduleView() {
        const desktopSchedule = document.querySelector('.desktop-schedule');
        const mobileSchedule = document.querySelector('.mobile-schedule');
        
        if (window.innerWidth < 768) {
          desktopSchedule.style.display = 'none';
          mobileSchedule.style.display = 'block';
        } else {
          desktopSchedule.style.display = 'block';
          mobileSchedule.style.display = 'none';
        }
      }
});