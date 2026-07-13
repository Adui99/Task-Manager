import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true" || false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendTaskAssignmentEmail = async (userEmail: string, taskName: string, taskUrl?: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Skipping email notification.");
    return;
  }

  const mailOptions = {
    from: `"Mini Kanban AI" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `[Thông báo] Bạn có một công việc mới: ${taskName}`,
    html: `
      <h2>Bạn vừa được giao một công việc mới</h2>
      <p>Tên công việc: <strong>${taskName}</strong></p>
      <p>Hãy đăng nhập vào hệ thống Kanban để cập nhật tiến độ công việc của bạn.</p>
      <p><a href="https://task-manager-ktd.vercel.app/">Truy cập hệ thống Kanban tại đây</a></p>
      <br/>
      <hr />
      <p><small>Đây là email tự động từ hệ thống Mini Kanban AI. Vui lòng không trả lời.</small></p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    throw error;
  }
};

export const sendOverdueReminderEmail = async (userEmail: string, userName: string, tasks: any[]) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Skipping email notification.");
    return;
  }

  const tasksHtml = tasks.map(t => `<li><strong>${t.title}</strong> (Deadline: ${new Date(t.deadline).toLocaleDateString('vi-VN')})</li>`).join("");

  const mailOptions = {
    from: `"Mini Kanban AI" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `[Cảnh báo] Bạn có ${tasks.length} công việc quá hạn!`,
    html: `
      <h2>Chào ${userName},</h2>
      <p>Hệ thống ghi nhận bạn đang có <strong>${tasks.length}</strong> công việc đã vượt quá thời hạn (Deadline) mà chưa hoàn thành:</p>
      <ul>
        ${tasksHtml}
      </ul>
      <p>Vui lòng đăng nhập vào hệ thống và xử lý các công việc này sớm nhất có thể.</p>
      <p><a href="https://task-manager-ktd.vercel.app/">Truy cập hệ thống Kanban tại đây</a></p>
      <br/>
      <hr />
      <p><small>Đây là email nhắc nhở tự động từ hệ thống Mini Kanban AI. Vui lòng không trả lời.</small></p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Overdue reminder email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi khi gửi email nhắc nhở:", error);
    throw error;
  }
};

export const sendAdminOverdueEmail = async (adminEmails: string[], tasks: any[]) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Skipping email notification.");
    return;
  }

  const tasksHtml = tasks.map(t => `<li><strong>${t.title}</strong> (Deadline: ${new Date(t.deadline).toLocaleDateString('vi-VN')} - Trạng thái: ${t.status})</li>`).join("");

  const mailOptions = {
    from: `"Mini Kanban AI" <${process.env.SMTP_USER}>`,
    to: adminEmails.join(","),
    subject: `[Báo cáo Admin] Có ${tasks.length} công việc đã trễ deadline quá 3 ngày`,
    html: `
      <h2>Kính gửi Ban Quản Trị,</h2>
      <p>Hệ thống ghi nhận có <strong>${tasks.length}</strong> công việc đã vượt quá thời hạn (Deadline) hơn 3 ngày nhưng vẫn chưa hoàn thành:</p>
      <ul>
        ${tasksHtml}
      </ul>
      <p>Vui lòng đăng nhập vào hệ thống để xem xét và có biện pháp xử lý kịp thời.</p>
      <p><a href="https://task-manager-ktd.vercel.app/">Truy cập hệ thống Kanban tại đây</a></p>
      <br/>
      <hr />
      <p><small>Đây là email báo cáo tự động từ hệ thống Mini Kanban AI. Vui lòng không trả lời.</small></p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Admin overdue report email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi khi gửi email báo cáo admin:", error);
    throw error;
  }
};

export const sendForgotPasswordEmail = async (userEmail: string, resetUrl: string) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("SMTP credentials missing. Skipping email notification.");
    return;
  }

  const mailOptions = {
    from: `"Mini Kanban AI" <${process.env.SMTP_USER}>`,
    to: userEmail,
    subject: `[Bảo mật] Yêu cầu đặt lại mật khẩu`,
    html: `
      <h2>Yêu cầu đặt lại mật khẩu</h2>
      <p>Bạn nhận được email này vì bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên hệ thống Mini Kanban AI.</p>
      <p>Vui lòng click vào đường link bên dưới để đặt lại mật khẩu của bạn. Link này sẽ hết hạn sau 1 giờ:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này và mật khẩu của bạn sẽ không bị thay đổi.</p>
      <br/>
      <hr />
      <p><small>Đây là email tự động từ hệ thống Mini Kanban AI. Vui lòng không trả lời.</small></p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Forgot password email sent: " + info.response);
    return info;
  } catch (error) {
    console.error("Lỗi khi gửi email quên mật khẩu:", error);
    throw error;
  }
};
